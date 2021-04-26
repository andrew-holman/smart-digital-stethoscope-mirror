import {
  Component,
  Input,
  DoCheck,
  OnChanges,
  ChangeDetectorRef,
  OnInit,
  Output,
  EventEmitter,
} from "@angular/core";
import { User } from "firebase";
import { StorageReference } from "src/app/connect/storage/storage-reference";
import { StorageService, DatabaseService } from "src/app/connect";
import { ListResult } from "@angular/fire/storage/interfaces";
import WaveSurfer from "wavesurfer.js"
import { FileInfo } from "src/app/navbar/navbar.component";
import { Subject, interval, timer } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { dbUser } from "src/app/utils/profiles/user-profile.service";
import "firebase/app";

@Component({
  selector: "dss-saved",
  templateUrl: "./saved.component.html",
  styleUrls: ["./saved.component.css"],
})
export class SavedComponent {
  @Input() user: User;
  @Input() fileInfo: FileInfo[];
  @Input() loading: boolean;
  @Input() dbUser: dbUser;
  @Input() predictionUrl: string;
  dividedFileInfo: FileInfo[][];
  userSub: string;
  @Output() refreshAudio: EventEmitter<void> = new EventEmitter<void>();
  @Output() deleteAudio: EventEmitter<string> = new EventEmitter<string>();
  wavesurfer: any;
  currentDisplayedWaveform: string;
  fileSending: string;
  receivingUserName: string = '';
  pageLoaded: Subject<void> = new Subject<void>();

  constructor(
    private databaseService: DatabaseService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    interval(100).pipe(takeUntil(this.pageLoaded)).subscribe(async () => {
      if (!this.loading) {
        this.dividedFileInfo = this.groupBy(this.fileInfo, "owner");
        this.pageLoaded.next();
      }
    });
  }

  private groupBy(arr, prop): FileInfo[][] {
    let splitIndex = -1;
    let splitArr: FileInfo[][] = [];
    let sortedArr: FileInfo[] = arr.sort(x=> x.owner);
    for (let i=0; i<sortedArr.length; i++) {
      if (splitArr.length === 0 || sortedArr[i].owner !== splitArr[splitIndex][0].owner) {
        splitIndex++;
        splitArr.push([sortedArr[i]]);
      } else {
        splitArr[splitIndex].push(sortedArr[i]);
      }
    }
    return splitArr;
  }
}