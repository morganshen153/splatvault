export interface Project {
  id: string
  name: string
  description?: string
  rootPath?: string
  createdAt: number
}

export interface Collection {
  id: string
  projectId: string
  name: string
  description?: string
}

export interface CollectionAsset {
  collectionId: string
  assetId: string
  addedAt: number
  note?: string
}

export interface Tag {
  id: string
  name: string
  color?: string
}
