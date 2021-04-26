import { Component, Input } from "@angular/core";
import * as firebase from "firebase";
import { User } from "firebase";
import { DatabaseService } from "src/app/connect/database/database.service";
import { dbPatient } from "src/app/utils/profiles/patient-profile.service";
import { dbPrimaryCareProf } from "src/app/utils/profiles/primary-care-profile.service";
import { dbUser, UserType } from "src/app/utils/profiles/user-profile.service";

@Component({
  selector: "dss-home",
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.css"],
})
export class HomeComponent {
  @Input() user: User;
  @Input() dbUser: dbUser;

  UserType: typeof UserType = UserType;

  constructor(private dbService: DatabaseService){}
}
