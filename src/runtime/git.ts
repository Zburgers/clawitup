export interface GitReader {
  listChangedFiles(): Promise<string[]>;
}
