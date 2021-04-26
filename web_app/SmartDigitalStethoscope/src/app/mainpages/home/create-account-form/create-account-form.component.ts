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
  selector: "dss-create-account",
  templateUrl: "./create-account-form.component.html",
  styleUrls: ["./create-account-form.component.css"],
})
export class CreateAccountFormComponent {
  form = new FormGroup({
    // Form controls
    name: new FormControl(null, Validators.required),
    email: new FormControl(null, [Validators.required, Validators.email]),
    password: new FormControl(null, Validators.required),
    user_type: new FormControl(null, Validators.required),
    careProf: new FormControl(null),
    patients: new FormControl(null),
  });

  UserType: UserType[] = [UserType.Patient, UserType.PrimaryCareProfessional,  UserType.Admin];
  UserTypeEnum: typeof UserType = UserType;
  AvailablePatients: {email: string, ref: string}[] = [];
  Professionals: {email: string, ref: string}[] = [];
  
  Error: string;
  Success: string;

  constructor(private dbService: DatabaseService,
    private profService: PrimaryCareProfProfile,
    private patientSerivce: PatientProfile,
    private adminSerivce: AdminProfile){}

  ngOnInit(): void {
    this.getAllUserInfo();
  }

  onSubmit(): void {
    if (!this.form.valid) {
      return;
    }
    let accountType: UserType = this.form.get('user_type').value;
    let email = this.form.get('email').value;
    let name = this.form.get('name').value;
    let password = this.form.get('password').value;
    console.log(accountType);

    if (accountType == UserType.Patient) {
      let profId: string = this.form.get('careProf').value;
      this.patientSerivce.auth.registerNew(email, password, name).then(rtrn => {
        let user = rtrn[0];
        this.patientSerivce.register(user, profId).then(() => {
          if (profId)
            this.dbService.setSpecificUser(profId, {patientIds: firebase.firestore.FieldValue.arrayUnion(user.uid)});
        });
      }).catch(err => this.Error = 'Failed to register new user because of following error: ' + err);
    } else if (accountType == UserType.PrimaryCareProfessional) {
      let patientIds: string[] = this.form.get('patients').value;
      this.profService.auth.registerNew(email, password, name).then(rtrn => {
        let user = rtrn[0];
        this.profService.register(user, patientIds, true).then(() => this.dbService.setMultipleUsers(patientIds, {primaryCareProfId: user.uid}))
      }).catch(err => this.Error = 'Failed to register new user because of following error: ' + err);
    } else if (accountType == UserType.Admin) {
      this.adminSerivce.auth.registerNew(email, password, name).then(rtrn => {
        let user = rtrn[0];
        this.adminSerivce.register(user, true).catch(err => this.Error = 'Failed to register new user because of following error: ' + err);
      }).catch(err => this.Error = 'Failed to register new user because of following error: ' + err);
    } else {
      console.log('ERROR: Invalid account type');
    }
  }
  
  public UserTypeString(type: UserType): string {
    switch(type) {
      case UserType.Patient:
        return "Patient";
      case UserType.PrimaryCareProfessional:
        return "Primary Care Professional";
      case UserType.Admin:
        return "Admin";
      default:
        return "Invalid Type";
    }
  }

  private getAllUserInfo(): void {
    this.dbService.firestore
      .collection("users")
      .get()
      .then((userList) => {
        let patients = userList.docs.filter(x => x.data()['user_type'] === UserType.Patient && x.data()['primaryCareProfId'] == null);
        let profs = userList.docs.filter(x => x.data()['user_type'] === UserType.PrimaryCareProfessional);
        this.AvailablePatients = patients.map(patient => {
          return {email: patient.data()['email'] as string, ref: patient.id}
        });
        this.Professionals = profs.map(prof => {
          return {email: prof.data()['email'] as string, ref: prof.id}
        });
      })
      .catch((err) => {
        console.log("ERROR, make sure you have permissions!", err);
      });
  }
}
