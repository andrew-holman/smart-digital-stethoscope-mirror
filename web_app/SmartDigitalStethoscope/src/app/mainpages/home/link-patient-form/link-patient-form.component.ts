import { Component, Input } from "@angular/core";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import * as firebase from "firebase";
import { User } from "firebase";
import { DatabaseService } from "src/app/connect/database/database.service";
import { AdminProfile } from "src/app/utils/profiles/admin-profile.service";
import { dbPatient, PatientProfile } from "src/app/utils/profiles/patient-profile.service";
import { dbPrimaryCareProf, PrimaryCareProfProfile } from "src/app/utils/profiles/primary-care-profile.service";
import { dbUser, UserType } from "src/app/utils/profiles/user-profile.service";

@Component({
  selector: "dss-link-account",
  templateUrl: "./link-patient-form.component.html",
  styleUrls: ["./link-patient-form.component.css"],
})
export class LinkPatientFormComponent {
  @Input() user: User;

  form = new FormGroup({
    patients: new FormControl(null, Validators.required),
  });

  AvailablePatients: {email: string, ref: string}[] = [];
  MyPatients: {email: string, ref: string}[] = [];
  Error: string;
  Success: string;

  constructor(private dbService: DatabaseService){}

  ngOnInit(): void {
    this.getAllUserInfo();
  }

  onSubmit(): void {
    if (!this.form.valid) {
      return;
    }
    let patientIds: string[] = this.form.get('patients').value;
    this.dbService.setSpecificUser(this.user.uid, {patientIds: firebase.firestore.FieldValue.arrayUnion.apply(this, patientIds)});
    this.dbService.setMultipleUsers(patientIds, {primaryCareProfId: this.user.uid})
    .then(() => {
      this.Success = "Users linked successfully";
      this.getAllUserInfo();
    })
    .catch((err) => this.Error = "Users failed to link: " + err);
  }

  private getAllUserInfo(): void {
    this.dbService.firestore
      .collection("users")
      .get()
      .then((userList) => {
        let patients = userList.docs.filter(x => x.data()['user_type'] === UserType.Patient && (x.data()['primaryCareProfId'] == null || x.data()['primaryCareProfId'].length === 0));
        let myPatients = userList.docs.filter(x => x.data()['user_type'] === UserType.Patient && x.data()['primaryCareProfId'] === this.user.uid);
        this.AvailablePatients = patients.map(patient => {
          return {email: patient.data()['email'] as string, ref: patient.id}
        });
        this.MyPatients = myPatients.map(patient => {
          return {email: patient.data()['email'] as string, ref: patient.id}
        });
      })
      .catch((err) => {
        console.log("ERROR, make sure you have permissions!", err);
      });
  }
}
