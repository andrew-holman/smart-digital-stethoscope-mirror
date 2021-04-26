import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { HeaderComponent } from "./header/header.component";
import { NavbarComponent } from "./navbar/navbar.component";
import { HomeComponent } from "./mainpages/home/home.component";
import { SavedComponent } from "./mainpages/saved/saved.component";
import {
  RecordComponent,
  SafeUrlPipe,
} from "./mainpages/record/record.component";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import {
  ConnectModule,
  AuthModule,
  DatabaseModule,
  StorageModule,
  ConnectConfig,
  StorageService,
  DatabaseService,
} from "./connect";
import { LoginModule } from "./login/login.module";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { AudioRecordingService } from "./recording/recording.service";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AudioCardComponent } from './mainpages/saved/audio-card/audio-card.component';
import { CreateAccountFormComponent } from "./mainpages/home/create-account-form/create-account-form.component";
import { LinkPatientFormComponent } from "./mainpages/home/link-patient-form/link-patient-form.component";
import { HistoryComponent } from "./mainpages/history/history.component";
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';

// Firebase configuration for wizdm experiments
const config: ConnectConfig = {
  appname: "SmartDigitalStethoscope", //"wizdm-experiments",
  firebase: {
    apiKey: "AIzaSyBptLEEtRgnmVPGAIZ4qEAHogYow2pxkMk",
    authDomain: "smartdigitalstethoscope.firebaseapp.com",
    databaseURL: "https://smartdigitalstethoscope.firebaseio.com",
    projectId: "smartdigitalstethoscope",
    storageBucket: "smartdigitalstethoscope.appspot.com",
    messagingSenderId: "181967907172",
    appId: "1:181967907172:web:76608b6368fd11fb673271",
    measurementId: "G-KJW9CD3CG8",
  },
};

// const firebaseConfig = {
//   apiKey: "AIzaSyBptLEEtRgnmVPGAIZ4qEAHogYow2pxkMk",
//   authDomain: "smartdigitalstethoscope.firebaseapp.com",
//   databaseURL: "https://smartdigitalstethoscope.firebaseio.com",
//   projectId: "smartdigitalstethoscope",
//   storageBucket: "smartdigitalstethoscope.appspot.com",
//   messagingSenderId: "181967907172",
//   appId: "1:181967907172:web:76608b6368fd11fb673271",
//   measurementId: "G-KJW9CD3CG8",
// };

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    NavbarComponent,
    HomeComponent,
    SavedComponent,
    RecordComponent,
    AudioCardComponent,
    CreateAccountFormComponent,
    SafeUrlPipe,
    LinkPatientFormComponent,
    HistoryComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,

    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    // Initialize the connect module
    ConnectModule.init(config),
    AuthModule,
    DatabaseModule,
    StorageModule,
    LoginModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  providers: [StorageService, DatabaseService, AudioRecordingService],
  bootstrap: [AppComponent],
})
export class AppModule {}
