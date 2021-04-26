import { Component, Input } from "@angular/core";
import {User} from "src/app/connect";
import{dbUser} from "src/app/utils/profiles/user-profile.service";

@Component({
  selector: "dss-history",
  templateUrl: "./history.component.html",
  styleUrls: ["./history.component.css"],
})
export class HistoryComponent {
  @ Input() user:User;
  @ Input() dbUser: dbUser;
  constructor(){}
}
