import { Component, Output } from "@angular/core";
import {
  AuthService,
  User,
  DatabaseService,
  StorageService,
  StorageReference,
} from "../connect";
import { dbUser, UserProfile, UserType } from "../utils/profiles/user-profile.service";

@Component({
  selector: "dss-navbar",
  templateUrl: "./navbar.component.html",
  styleUrls: ["./navbar.component.css"],
})
export class NavbarComponent {
  navbar: any;
  homepage: any;
  savedpage: any;
  recordpage: any;
  livepage: any;
  offset: any = window.innerWidth >= 532 ? 30 : 40;
  sticky: any;
  authService: AuthService;
  user: User;
  database_user: dbUser;
  fileInfo: FileInfo[] = [];
  gettingFiles: boolean = true;
  userSub: string;
  UserType: typeof UserType = UserType;
  predictionUrl: string;

  constructor(
    authService: AuthService,
    private databaseService: DatabaseService,
    private storageService: StorageService,
    private profile: UserProfile<dbUser>
  ) {
    this.authService = authService;
  }
  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
    this.profile.stream().subscribe((user) => {
      this.database_user = user;
      this.retreiveServerData();
    });
    window.onload = () => {
      this.navbar = document.getElementById("myTab");
      this.homepage = document.getElementById("home");
      this.savedpage = document.getElementById("saved");
      this.recordpage = document.getElementById("record");
      this.sticky = window.innerWidth >= 532 ? 111 : 207;
      this.offset = window.innerWidth >= 532 ? 30 : 40;

      window.onscroll = () => {
        if (window.pageYOffset >= this.sticky) {
          this.navbar.classList.add("sticky");
          this.homepage.classList.add("offset");
          this.savedpage.classList.add("offset");
          this.recordpage.classList.add("offset");
        } else if (this.navbar.classList.contains("sticky")) {
          this.navbar.classList.remove("sticky");
          this.homepage.classList.remove("offset");
          this.savedpage.classList.remove("offset");
          this.recordpage.classList.remove("offset");
        }
      };
    };
    window.addEventListener("resize", () => {
      this.offset = window.innerWidth >= 532 ? 30 : 40;
      this.sticky = window.innerWidth >= 532 ? 111 : 207;
    });
  }

  public async retreiveServerData(): Promise<void> {
    console.log('retreving server data');
    if (!this.user) {
      return;
    }
    this.gettingFiles = true;

    await this.user.getIdTokenResult().then((val) => {
      this.userSub = val.claims.sub;
    });

    if (this.database_user.user_type === UserType.PrimaryCareProfessional) {
      this.databaseService.firestore
        .collection("users")
        .get()
        .then(async (userList) => {
          let myPatients = userList.docs.filter(x => x.data()['user_type'] === UserType.Patient && x.data()['primaryCareProfId'] === this.user.uid);
          let doctor = userList.docs.find(x => x.ref.id === this.user.uid);

          this.fileInfo = [];
          let audio_files = doctor.data()["audio"];
          let audio_sizes = doctor.data()["audio_size"];
          let audioRef = this.storageService.refFromURL(
            "gs://smartdigitalstethoscope.appspot.com"
          );
          await this.fillUserUrls(audio_files, audio_sizes, audioRef, this.database_user.email);
          for (let i=0; i<myPatients.length; i++) {
            await this.fillUserUrls(myPatients[i].data()["audio"], myPatients[i].data()["audio_size"], audioRef, myPatients[i].data()['email']);
          }
          this.gettingFiles = false;
          console.log('Retreived Audio Files');
        })
        .catch((err) => {
          console.log("ERROR, make sure you have permissions!", err);
        });
    } else {
      this.databaseService.firestore
      .collection("users")
      .doc(this.userSub)
      .get()
      .then(async (querySnapshot) => {
        this.fileInfo = [];
        let audio_files = querySnapshot.data()["audio"];
        let audio_sizes = querySnapshot.data()["audio_size"];

        let audioRef = this.storageService.refFromURL(
          "gs://smartdigitalstethoscope.appspot.com"
        );
        await this.fillUserUrls(audio_files, audio_sizes, audioRef, querySnapshot.data()["email"]);
        this.gettingFiles = false;
        console.log('Retreived Audio Files');
      })
      .catch((err) => {
        console.log("ERROR, make sure you have permissions!", err);
      });
    }
    this.databaseService.firestore
      .collection("info")
      .get()
      .then(async (querySnapshot) => {
        this.predictionUrl = querySnapshot.docs[0].data()['prediction_url'];
        console.log('Got prediction URL');
      })
      .catch((err) => {
        console.log("ERROR, make sure you have permissions!", err);
      });
  }

  private async fillUserUrls(
    audio_files: string[],
    audio_sizes: number[],
    audioRef: StorageReference,
    owner: string
  ): Promise<void> {
    for (let i = 0; i < audio_files.length; i++) {
      await audioRef
        .child(audio_files[i])
        .getDownloadURL()
        .then((url) => {
          this.fileInfo.push({
            fileName: audio_files[i],
            fileSize: audio_sizes[i],
            url: url,
            owner: owner
          });
        });
    }
  }

  public async deleteAudio(audio_file: string): Promise<void> {
    if (!this.user) {
      alert("You must be authenticated to delete");
      return;
    }
    if (!confirm("Are you sure you want to delete " + audio_file + " it will no longer be available.")){
      return;
    }

    let audioRef = this.storageService.refFromURL(
      "gs://smartdigitalstethoscope.appspot.com"
    );

    audioRef
      .child(audio_file)
      .delete()
      .then(() => {
        console.log("Deleted file from storage");
      })
      .catch((err) => {
        throw err;
      });

    await this.user.getIdTokenResult().then((val) => {
      this.userSub = val.claims.sub;
    });

    let indexToRemove = this.fileInfo
      .map((x) => x.fileName)
      .indexOf(audio_file);
    this.fileInfo.splice(indexToRemove, 1);

    console.log(audio_file);
    this.databaseService.firestore
      .collection("users")
      .doc(this.userSub)
      .update({
        audio: this.fileInfo.map((x) => x.fileName),
        audio_size: this.fileInfo.map((x) => x.fileSize),
      })
      .then(() => {
        console.log("Removed user references");
      })
      .catch((err) => {
        console.log("Couldn't delete user references!", err);
      });
  }
}

export class FileInfo {
  fileName: string; 
  fileSize: number;
  url: string;
  owner?: string
}