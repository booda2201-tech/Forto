import { Component} from '@angular/core';
import { Router } from '@angular/router';



@Component({
  selector: 'app-cashier-page',
  templateUrl: './cashier-page.component.html',
  styleUrls: ['./cashier-page.component.scss']
})
export class CashierPageComponent {
    constructor(public router: Router) {}
}

