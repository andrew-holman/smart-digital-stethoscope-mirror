import { stUploadTask, stUploadTaskSnapshot } from './storage.service';
import { Observable, Observer, Subscriber } from 'rxjs';
import { map } from 'rxjs/operators';

export class UploadTask {

  /** 
   * An observable streaming the task progress. 
   * Unlike the AngularFireUploadTask implementation the task do NOT get cancelled 
   * by unsubscribing while only the inner task events get disconnected
   * */
  readonly snapshot$: Observable<stUploadTaskSnapshot>;

  /** An observable streaming the task progress as percentage */
  readonly progress$: Observable<number>;

  constructor(readonly task: stUploadTask) {

    // Builds the uploading progress observable.
    this.snapshot$ = new Observable(subscriber => task.on('state_changed',
      snap => subscriber.next(snap),
      error => subscriber.error(error),
      () => subscriber.complete() 
    ));

    this.progress$ = this.snapshot$.pipe( map(s => s.bytesTransferred / s.totalBytes * 100) );
  }

  /** Pauses the task */
  public pause(): boolean { return this.task.pause(); }
  /** Resumes the task */
  public resume(): boolean { return this.task.resume(); }
  /** Cancels the task */
  public cancel(): boolean { return this.task.cancel(); }  

  /** Promise-like then */
  public then(fulfilled?: ((s: stUploadTaskSnapshot) => any) | null, rejected?: ((e: Error) => any) | null): Promise<any> {
    return this.task.then(fulfilled, rejected);
  }
  /** Promise-like catch */
  public catch(rejected: (e: Error) => any): Promise<any> {
    return this.task.catch(rejected);
  }
}