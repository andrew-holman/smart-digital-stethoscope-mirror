import { Component, EventEmitter, Input, OnDestroy, Output, PipeTransform } from "@angular/core";
import { User } from "firebase";
import { DatabaseService } from "src/app/connect/database/database.service";
import * as firebase from "firebase/app";
import "firebase/app";
import { StorageService } from "src/app/connect/storage/storage.service";
import {
  AudioRecordingService,
  RecordedAudioOutput,
} from "src/app/recording/recording.service";
import { take } from "rxjs/internal/operators/take";
import { dbUser, UserType } from "src/app/utils/profiles/user-profile.service";
import { Pipe } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import WaveSurfer from "wavesurfer.js"
import { FileInfo } from "src/app/navbar/navbar.component";
import { interval, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

@Component({
  selector: "dss-record",
  templateUrl: "./record.component.html",
  styleUrls: ["./record.component.css"],
})
export class RecordComponent implements OnDestroy {
  @Input() user: User;
  @Input() dbUser: dbUser;
  @Output() refreshAudio: EventEmitter<void> = new EventEmitter<void>();
  @Input() fileInfo: FileInfo[];
  @Input() predictionUrl: string;
  userSub: string;
  isRecording: boolean = false;
  recording: RecordedAudioOutput;
  fileName: string = "DefaultName";
  fileSize: number = 0;
  successMessage: string = "";
  audioURL: string = "";
  sampleRates: number[] = [
    8 * 1000,
    16 * 1000,
    32 * 1000,
    48 * 1000,
    64 * 1000,
  ];
  selectedRate: number = 8 * 1000;
  wavesurfer: any;
  uploaded_file: File;
  errorMessage: string;
  prediction: string;
  confidence: string;
  predicting: boolean = false;
  patient_user: string;
  MyPatients: {email: string, ref: string}[] = [];
  selected_patient: string;

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService,
    private recordingService: AudioRecordingService
  ) {}


  UserType: typeof UserType = UserType;
  ngOnInit(): void {
    this.getAllUserInfo();
  }

  async startRecording(): Promise<void> {
    // if (!(await this.checkAvailableDevices())) {
    //   console.log("Failed to connect to audio device!");
    //   return;
    // }

    this.prediction = "";
    this.confidence = "";
    if (this.isRecording) {
      this.recordingService.stopRecording();
      return;
    }
    if (this.recording) {
      if (!confirm("Are you sure you want to record another audio file? It will erase the one that you just recorded.")){
        return;
      }
      if (this.wavesurfer) {
        this.wavesurfer.destroy();
      } 
    }
    this.successMessage = "";

    this.recordingService
      .getRecordedBlob()
      .pipe(take(1))
      .subscribe((recordedAudio) => {
        this.recording = recordedAudio;
        this.fileSize = this.roundNum(this.recording.blob.size / 1024);
        this.audioURL = URL.createObjectURL(this.recording.blob);
        this.isRecording = false;
        this.viewRecording();
      });

    this.recordingService.startRecording(this.selectedRate);
    this.isRecording = true;
  }

  async saveRecording(): Promise<void> {
    console.log(this.fileName);
    let upload_blob: Blob;
    if (this.recording == null) {
      if (this.uploaded_file == null) {
        return;
      }
      upload_blob = this.uploaded_file;
    } else {
      upload_blob = this.recording.blob;
    }
    if (this.fileName.length === 0) {
      alert("You need to name the file.");
      return;
    }

    let adjustedFileName = this.user.email + "_" + this.fileName + ".wav";
    if (this.fileInfo.map((x) => x.fileName).includes(adjustedFileName)) {
      alert(
        "You need to create a unique name. Check your saved recordings to see your other recordings."
      );
      return;
    }

    let currentUsage = 0;
    this.fileInfo
      .map((x) => x.fileSize)
      .forEach((size) => (currentUsage += size));
    if (currentUsage + this.fileSize > this.dbUser.allowedStorage) {
      alert(
        "This file is too large, it is " +
          this.fileSize +
          "KB and you currently have " +
          currentUsage +
          "KB stored. Your current account limit is " +
          this.dbUser.allowedStorage +
          "KB. Please delete some saved files to make room."
      );
      return;
    }

    let audioRef = this.storageService.refFromURL(
      "gs://smartdigitalstethoscope.appspot.com"
    );
    if (!this.selected_patient || this.selected_patient == "") {
      await this.user.getIdTokenResult().then((val) => {
        this.userSub = val.claims.sub;
      });
    } else {
      this.userSub = this.selected_patient;
      adjustedFileName = this.MyPatients.find(x=>x.ref==this.selected_patient).email + "_" + this.fileName + ".wav";
    }

    await Promise.all([this.databaseService.firestore
      .collection("users")
      .doc(this.userSub)
      .update({
        audio: firebase.firestore.FieldValue.arrayUnion(adjustedFileName),
        audio_size: firebase.firestore.FieldValue.arrayUnion(this.fileSize),
      }), 
      audioRef
      .child(adjustedFileName)
      .put(upload_blob)
      .then((val) => {
        this.fileInfo.push({
          fileName: adjustedFileName,
          fileSize: this.fileSize,
          url: ""
        });
      })
      .catch((err) => {
        throw err;
      })]).then(() => {
        console.log("Document successfully written!");
        this.deleteAudioSample();
        this.successMessage = "File saved successfully!\nPredicting sample...\n";
        this.predict(adjustedFileName);
      })
      .catch((error) => {
        console.error("Error writing document: ", error);
      });
  }

  private checkAvailableDevices(): Promise<boolean> {
    return navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (stream.getAudioTracks().length > 0) {
          return true;
        } else {
          return false;
        }
      });
  }

  private roundNum(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  public deleteRecording(): void {
    if (!confirm("Are you sure you want to delete this recording?")) {
      return;
    }
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    } 
    this.deleteAudioSample();
  }

  public viewRecording(): void { 
    this.wavesurfer = WaveSurfer.create({
      container: '#waveform',
      barHeight: 2,
      barMinHeight: 0.05,
      forceDecode: true,
      interact: false,
      waveColor: '#848cd3c5', //visualTaste
      progressColor: '#6970b1c5' //visualTasteDark
    });
    this.wavesurfer.load(this.audioURL);
  }

  deleteAudioSample(): void {
    URL.revokeObjectURL(this.audioURL);
    this.recording = null;
    this.uploaded_file = null;
    if (this.wavesurfer) {
      this.wavesurfer.destroy();
    }
    this.wavesurfer = null;
    this.fileName = "DefaultName";
    this.fileSize = 0;
    this.audioURL = "";
  }
  updateWaveformPosition(positionInfo: any): void {
    if (!positionInfo.srcElement.paused) { //In this case the player is just restarting and manually setting the position won't play it properly.
      this.wavesurfer.play();
      return;
    }
    this.wavesurfer.seekTo(positionInfo.srcElement.currentTime / positionInfo.srcElement.duration);
  }

  public fileUploaded(event): void {
    if (this.wavesurfer) {
      this.deleteAudioSample();
    }
    this.prediction = "";
    this.confidence = "";
    this.errorMessage = "";
    this.uploaded_file = event.target.files[0];
    if (!this.uploaded_file) {
      this.errorMessage = "Please select a file.";
      return;
    } else if (!this.uploaded_file.name.includes('.wav')){
      this.errorMessage = "Chosen file is not a .wav file. Please convert it and try again."
      return;
    }

    this.fileSize = this.roundNum(this.uploaded_file.size / 1024);
    this.audioURL = URL.createObjectURL(this.uploaded_file);
    this.isRecording = false;
    this.viewRecording();
  }

  public async predict(newFileName: string) {
    this.predicting = true;
    let endEmitter = new Subject<void>();
    interval(100).pipe(takeUntil(endEmitter)).subscribe(() => {
      let newFileInfo = this.fileInfo.find(x=>x.fileName==newFileName && x.url != "");
      if (newFileInfo) {
        let url = this.predictionUrl + '\"' + newFileInfo.url + '\"';
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
          console.log(res);
          this.predicting = false;
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
        endEmitter.next();
      }
    });
  }
  
  private getAllUserInfo(): void {
    this.databaseService.firestore
      .collection("users")
      .get()
      .then((userList) => {
        let myPatients = userList.docs.filter(x => x.data()['user_type'] === UserType.Patient && x.data()['primaryCareProfId'] === this.user.uid);
        this.MyPatients = myPatients.map(patient => {
          return {email: patient.data()['email'] as string, ref: patient.id}
        });
      })
      .catch((err) => {
        console.log("ERROR, make sure you have permissions!", err);
      });
  }

  ngOnDestroy(): void {
    URL.revokeObjectURL(this.audioURL);
  }
}

@Pipe({ name: "safeResourceUrl" })
export class SafeUrlPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  public transform(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
