interface ManifestPath {
  id: string
}


export interface Manifest {
  manifest: string
  version: string
  index: {
    path: string
  }
  paths: Record<string, ManifestPath>
}
