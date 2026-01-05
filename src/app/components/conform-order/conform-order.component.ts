import { Component } from '@angular/core';

@Component({
  selector: 'app-conform-order',
  templateUrl: './conform-order.component.html',
  styleUrls: ['./conform-order.component.scss']
})
export class ConformOrderComponent {

selectedTimeId: string = '';

  selectTime(id: string) {
    this.selectedTimeId = id;
  }

}
