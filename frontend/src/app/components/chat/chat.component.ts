import { Component, OnInit } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: false,
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})

export class ChatComponent implements OnInit {
  
  currentUser: string | null = null;
  
  constructor (
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.socketService.currentUser;

    if(!this.currentUser){
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    this.socketService.disconnect();
    this.router.navigate(['/login']);
  }

}
