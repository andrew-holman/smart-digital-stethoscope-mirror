import { NgModule, ModuleWithProviders } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AngularFireModule,
  FirebaseOptions,
  FIREBASE_OPTIONS,
  FIREBASE_APP_NAME,
} from "@angular/fire";

export interface ConnectConfig {
  appname?: string;
  firebase: FirebaseOptions;
}

@NgModule({
  imports: [CommonModule, AngularFireModule],
  declarations: [],
})
export class ConnectModule {
  static init(config: ConnectConfig): ModuleWithProviders<ConnectModule> {
    return {
      ngModule: ConnectModule,
      providers: [
        { provide: FIREBASE_OPTIONS, useValue: config.firebase },
        { provide: FIREBASE_APP_NAME, useValue: config.appname },
      ],
    };
  }
}
