import { Injectable } from "@angular/core";
import * as RecordRTC from "recordrtc";
import { Observable } from "rxjs/internal/Observable";
import { Subject } from "rxjs/internal/Subject";
import * as moment from "moment";

export interface RecordedAudioOutput {
  blob: Blob;
  title: string;
}

@Injectable()
export class AudioRecordingService {
  constructor() {}

  private stream;
  private recorder;
  private interval;
  private startTime;
  private _recorded = new Subject<any>();
  private _recordingTime = new Subject<string>();
  private _recordingFailed = new Subject<string>();

  getRecordedBlob(): Observable<RecordedAudioOutput> {
    return this._recorded.asObservable();
  }

  getRecordedTime(): Observable<string> {
    return this._recordingTime.asObservable();
  }

  recordingFailed(): Observable<string> {
    return this._recordingFailed.asObservable();
  }

  startRecording(sampRate: number = 8 * 1000) {
    if (this.recorder) {
      // It means recording is already started or it is already recording something
      return;
    }

    this._recordingTime.next("00:00");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((s) => {
        this.stream = s;
        this.record(sampRate);
      })
      .catch((error) => {
        this._recordingFailed.next();
      });
  }
  private record(sampRate: number) {
    this.recorder = new RecordRTC.StereoAudioRecorder(this.stream, {
      type: "audio",
      mimeType: "audio/wav",
      desiredSampRate: sampRate,
      numberOfAudioChannels: 1,
    });

    this.recorder.record();
    this.startTime = moment();
    this.interval = setInterval(() => {
      const currentTime = moment();
      const diffTime = moment.duration(currentTime.diff(this.startTime));
      const time =
        this.toString(diffTime.minutes()) +
        ":" +
        this.toString(diffTime.seconds());
      this._recordingTime.next(time);
    }, 1000);
  }

  private toString(value) {
    let val = value;
    if (!value) {
      val = "00";
    }
    if (value < 10) {
      val = "0" + value;
    }
    return val;
  }

  stopRecording() {
    if (this.recorder) {
      this.recorder.stop(
        (blob) => {
          if (this.startTime) {
            const wavName = encodeURIComponent(
              "audio_" + new Date().getTime() + ".wav"
            );
            console.log("Stopped recording");
            console.log(this.recorder.buffer);
            console.log(this.recorder.view);
            this.stopMedia();
            this._recorded.next({ blob: blob, title: wavName });
          }
        },
        () => {
          this.stopMedia();
          this._recordingFailed.next();
        }
      );
    }
  }

  private stopMedia() {
    if (this.recorder) {
      this.recorder = null;
      clearInterval(this.interval);
      this.startTime = null;
      if (this.stream) {
        this.stream.getAudioTracks().forEach((track) => track.stop());
        this.stream = null;
      }
    }
  }

  abortRecording() {
    this.stopMedia();
  }

  getInterval(): any {
    return this.interval;
  }
}
