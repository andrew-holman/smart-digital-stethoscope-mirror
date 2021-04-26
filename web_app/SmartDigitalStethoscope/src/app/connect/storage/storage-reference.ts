import { StorageService, stReference, stUploadTask, stSettableMetadata, stUploadMetadata, stListResult, stListOptions, stFormat } from './storage.service';
import { UploadTask } from './upload-task';

/** Wraps the AngularFireStorageReference including list() and listAll() functionalities recently added to firebase API */
export class StorageReference {

  constructor(readonly st: StorageService, public ref: stReference) {}

  /** Returns a child StorageReference object */
  public child(path: string): StorageReference { 
    return this.st.ref( this.ref.child(path) ); 
  }

  //-- Reverts back to the original Primise-based storage API

  /** Returns the URL to download the file from */
  public getDownloadURL(): Promise<string> { 
    return this.ref.getDownloadURL();
  }

  /** Returns the file Metadata */
  public getMetadata(): Promise<stUploadMetadata>{ 
    return this.ref.getMetadata();
  }
  
  /** Updates the file Metadata */
  public updateMetadata(meta: stSettableMetadata): Promise<any> { 
    return this.ref.updateMetadata(meta); 
  }

  /** Deletes the file from the storage */
  public delete(): Promise<void> { 
    return this.ref.delete();
  }

  //-- Extends the functionalities including the latest listing API
  
  /** Lists the items (files) and prefixes (folders) up to the maximum number optionally expressed in options */
  public list(options?: stListOptions): Promise<stListResult> {
    return this.ref.list(options);
  }

  /** List all the files and folders */
  public listAll(): Promise<stListResult> {
    return this.ref.listAll();
  }

  //-- Wraps uploading functionalities with UploadTask class

  /** Creates an upload task for binary data */
  public put(data: Blob|Uint8Array|ArrayBuffer, metadata?: stUploadMetadata): UploadTask {
    return new UploadTask( this.ref.put(data, metadata) );
  }

  /** Creates an upload task for text encoded data */
  public putString(data: string, format?: stFormat, metadata?: stUploadMetadata): UploadTask {
    return new UploadTask( this.ref.putString(data, format, metadata) );
  }
} 