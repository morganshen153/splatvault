"""CLIP embedding bridge: called from Node.js via subprocess.

Usage:
  echo '{"action":"embed_text","input":"a dog"}' | python embed.py
  echo '{"action":"embed_image","input":"/path/to/image.jpg"}' | python embed.py
  echo '{"action":"embed_video_frames","input":"/path/to/video.mp4","fps":1}' | python embed.py

Output: {"vector": [0.1, ...], "dim": 512}
For video: {"frames": [{"time": 0.0, "vector": [...]}, ...]}
"""

import sys
import json
import os
import warnings
warnings.filterwarnings('ignore')

MODEL_NAME = os.environ.get('CLIP_MODEL', 'openai/clip-vit-base-patch32')

# If HF_ENDPOINT is not set but hf-mirror.com is available, use it
if 'HF_ENDPOINT' not in os.environ:
    try:
        import urllib.request
        urllib.request.urlopen('https://hf-mirror.com', timeout=3)
        os.environ['HF_ENDPOINT'] = 'https://hf-mirror.com'
    except Exception:
        pass

_clip_model = None
_clip_processor = None

def get_model():
    global _clip_model, _clip_processor
    if _clip_model is None:
        from transformers import CLIPProcessor, CLIPModel
        import torch
        _clip_model = CLIPModel.from_pretrained(MODEL_NAME)
        _clip_processor = CLIPProcessor.from_pretrained(MODEL_NAME)
        _clip_model.eval()
    return _clip_model, _clip_processor


def embed_text(text: str) -> dict:
    import torch
    model, processor = get_model()
    inputs = processor(text=[text], return_tensors='pt', padding=True)
    with torch.no_grad():
        output = model.get_text_features(**inputs)
    # Transformers v5 may return BaseModelOutputWithPooling instead of raw tensor
    if hasattr(output, 'pooler_output'):
        emb = output.pooler_output
    elif hasattr(output, 'last_hidden_state'):
        emb = output.last_hidden_state
    elif isinstance(output, torch.Tensor):
        emb = output
    else:
        # Fallback: try to extract tensor from the output object
        emb = output[0] if isinstance(output, (list, tuple)) else output
    vector = emb.squeeze().tolist() if hasattr(emb, 'squeeze') else emb
    return {'vector': vector, 'dim': len(vector) if hasattr(vector, '__len__') else 512}


def embed_image(image_path: str) -> dict:
    import torch
    from PIL import Image
    model, processor = get_model()
    if not os.path.exists(image_path):
        return {'error': f'Image not found: {image_path}'}
    image = Image.open(image_path).convert('RGB')
    inputs = processor(images=image, return_tensors='pt')
    with torch.no_grad():
        output = model.get_image_features(**inputs)
    if hasattr(output, 'pooler_output'):
        emb = output.pooler_output
    elif isinstance(output, torch.Tensor):
        emb = output
    else:
        emb = output[0] if isinstance(output, (list, tuple)) else output
    vector = emb.squeeze().tolist() if hasattr(emb, 'squeeze') else emb
    return {'vector': vector, 'dim': len(vector) if hasattr(vector, '__len__') else 512}


def embed_video_frames(video_path: str, fps: float = 1.0) -> dict:
    import torch
    from PIL import Image
    model, processor = get_model()

    try:
        import av
        container = av.open(video_path)
        stream = container.streams.video[0]
        fps_n = float(stream.average_rate)
        step = max(1, int(fps_n / fps))

        frames = []
        for i, frame in enumerate(container.decode(video=0)):
            if i % step != 0:
                continue
            img = frame.to_image().convert('RGB')
            inputs = processor(images=img, return_tensors='pt')
            with torch.no_grad():
                output = model.get_image_features(**inputs)
            if hasattr(output, 'pooler_output'):
                emb = output.pooler_output
            elif isinstance(output, torch.Tensor):
                emb = output
            else:
                emb = output[0] if isinstance(output, (list, tuple)) else output
            vector = emb.squeeze().tolist() if hasattr(emb, 'squeeze') else emb
            frames.append({
                'time': float(frame.time),
                'vector': vector,
                'dim': len(vector),
                'frame_index': i
            })
        container.close()
        return {'frames': frames, 'total_frames': len(frames)}
    except ImportError:
        # Fallback: extract single frame using PIL
        try:
            import subprocess
            import tempfile
            tmpf = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            tmp_path = tmpf.name
            tmpf.close()
            subprocess.run(
                ['ffmpeg', '-i', video_path, '-vframes', '1', tmp_path, '-y'],
                capture_output=True, timeout=30
            )
            if os.path.exists(tmp_path):
                img = Image.open(tmp_path).convert('RGB')
                inputs = processor(images=img, return_tensors='pt')
                with torch.no_grad():
                    output = model.get_image_features(**inputs)
                if hasattr(output, 'pooler_output'):
                    emb = output.pooler_output
                elif isinstance(output, torch.Tensor):
                    emb = output
                else:
                    emb = output[0] if isinstance(output, (list, tuple)) else output
                vector = emb.squeeze().tolist() if hasattr(emb, 'squeeze') else emb
                os.unlink(tmp_path)
                return {'frames': [{'time': 0.0, 'vector': vector, 'dim': len(vector), 'frame_index': 0}], 'total_frames': 1}
            os.unlink(tmp_path)
        except Exception as e:
            return {'error': f'Video processing failed: {e}'}
        return {'error': 'video processing not available (install av or ffmpeg)'}


def extract_frames_only(video_path: str, fps: float = 1.0) -> dict:
    """Extract video frames to temp JPEG files. Does NOT require CLIP model.
    Returns frame paths and metadata for TypeScript to embed with sharp."""
    import tempfile, os

    try:
        import av
        container = av.open(video_path)
        stream = container.streams.video[0]
        fps_n = float(stream.average_rate)
        step = max(1, int(fps_n / fps))

        tmp_dir = tempfile.mkdtemp(prefix='sv_frames_')
        frames = []
        for i, frame in enumerate(container.decode(video=0)):
            if i % step != 0:
                continue
            img = frame.to_image().convert('RGB')
            t = float(frame.time)
            frame_path = os.path.join(tmp_dir, f'frame_{i}.jpg')
            img.save(frame_path, 'JPEG', quality=85)
            frames.append({
                'time': t,
                'frame_path': frame_path,
                'frame_index': i,
            })

        container.close()
        return {
            'frames': frames,
            'total_frames': len(frames),
            'fps_target': fps,
            'fps_source': round(fps_n, 2),
            'tmp_dir': tmp_dir,
        }
    except ImportError:
        return {'error': 'PyAV not available, cannot extract frames'}
    except Exception as e:
        return {'error': f'Frame extraction failed: {e}'}


def main():
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
        action = data.get('action', '')

        if action == 'embed_text':
            result = embed_text(data['input'])
        elif action == 'embed_image':
            result = embed_image(data['input'])
        elif action == 'embed_video_frames':
            fps = float(data.get('fps', 1.0))
            result = embed_video_frames(data['input'], fps)
        elif action == 'extract_frames_only':
            fps = float(data.get('fps', 1.0))
            result = extract_frames_only(data['input'], fps)
        elif action == 'ping':
            result = {'status': 'ok', 'model': MODEL_NAME}
        elif action == 'batch_embed_images':
            paths = data.get('inputs', [])
            results = []
            for p in paths:
                r = embed_image(p)
                results.append({'path': p, **r})
            result = {'results': results, 'count': len(results)}
        else:
            result = {'error': f'Unknown action: {action}'}

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e), 'traceback': __import__('traceback').format_exc()}))
        sys.exit(1)


if __name__ == '__main__':
    main()
