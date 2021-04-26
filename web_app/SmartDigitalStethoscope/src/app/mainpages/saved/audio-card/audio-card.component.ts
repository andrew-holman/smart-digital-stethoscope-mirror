import {
  Component,
  Input,
  Output,
  EventEmitter,
} from "@angular/core";
import { StorageService, DatabaseService } from "src/app/connect";
import WaveSurfer from "wavesurfer.js"
import { interval, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FileInfo } from "src/app/navbar/navbar.component";


@Component({
  selector: "dss-audio-card",
  templateUrl: "./audio-card.component.html",
  styleUrls: ["./audio-card.component.css"],
})
export class AudioCardComponent {
  @Input() fileInfo: FileInfo;
  @Input() cardNum: number;
  @Input() canDelete: boolean;
  @Output() deleteAudio: EventEmitter<string> = new EventEmitter<string>();
  wavesurfer: any;
  pageLoaded: Subject<void> = new Subject<void>();
  isCreating: boolean = false;
  @Input() predictionUrl: string;
  prediction: string = ""
  confidence: string = ""
  predicting: boolean = false;
  // fileSending: string;
  // receivingUserName: string = '';
  errorMessage: string;

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    } 

    interval(100).pipe(takeUntil(this.pageLoaded)).subscribe(() => {
      let audioElement = document.getElementById(this.fileInfo.url);
      if (audioElement && audioElement.clientHeight > 0 && !this.isCreating) {
        this.isCreating = true;
        this.wavesurfer = WaveSurfer.create({
          container: '#waveformSaved' + this.cardNum,
          barHeight: 2,
          barMinHeight: 0.05,
          forceDecode: true,
          interact: false,
          waveColor: '#848cd3c5', //visualTaste
          progressColor: '#6970b1c5' //visualTasteDark
        });

        this.wavesurfer.load(this.fileInfo.url);
        let startTime = audioElement['currentTime'];
        let duration = audioElement['duration'];
        if (duration && startTime) {
          this.wavesurfer.seekTo(startTime / duration);
          this.pageLoaded.next();
          this.isCreating = false;
        }
      }
    });
  }

  public playWaveform(url: string): void {
    this.wavesurfer.play();
  }
  public pauseWaveform(url: string): void {
      this.wavesurfer.pause();
  }
  public updateWaveformPosition(positionInfo: any, url): void {
    if (!positionInfo.srcElement.paused) { //In this case the player is just restarting and manually setting the position won't play it properly.
      this.wavesurfer.play();
      return;
    }
    this.wavesurfer.seekTo(positionInfo.srcElement.currentTime / positionInfo.srcElement.duration);
  }

  public async predict() {
    this.predicting = true;
    let url = this.predictionUrl + '\"' + this.fileInfo.url + '\"';
    const Http = new XMLHttpRequest();
    Http.open("GET", url, true);
    Http.send();

    Http.onloadend = (e) => {
      console.log(Http.response)
      let res = Http.response.slice(2, Http.response.length - 4).split(' ').map(x => parseFloat(x));
      for (let i=0; i<res.length; i++) {
        if (isNaN(res[i])) {
          res.splice(i, 1);
          i--;
        }
      }
      if (res.length === 5) {
        res[2] = res[4] + res[1] + res[2];
        res[1] = res[3];
      }
      this.predicting = false;
      console.log(res);
      if (res[0] >= res[1]  && res[0] >= res[2]) {
        this.prediction = "Classification: Artifact";
        this.confidence = "Confidence: " + (res[0] * 100).toFixed(2) + "%.\nPlease try recording another.";
      } else if (res[1] >= res[0] && res[1] >= res[2]) {
        this.prediction = "Classification: Murmur";
        this.confidence = "Confidence: " + (res[1] * 100).toFixed(2) + "%";
      } else if (res[2] >= res[0] && res[2] >= res[1]) {
        this.prediction = "Classification: Normal";  
        this.confidence = "Confidence: " + (res[2] * 100).toFixed(2) + "%";   
      } else {
        this.prediction = "ERROR: invalid response";
      }
    }
    console.log(url);
  }
}
