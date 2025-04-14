import { Component, OnInit } from '@angular/core';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit{
  
  users: string[] = [];
  selectedUser: string | null = null;
  activeRooms: any[] = [];
  currentUser: string | null = null;
  
  constructor(private socketService: SocketService) {}


  ngOnInit(): void {
   this.currentUser = this.socketService.currentUser;

    this.socketService.getUserList().subscribe(users => {
      if(this.currentUser){
        this.users = users.filter(user => user !== this.currentUser);
      }
      else {
        this.users = users;
      }
    });

    this.socketService.onUserRooms().subscribe(rooms => {
      this.activeRooms = rooms;
    });

    this.socketService.getUserRooms();

  }


  getRoomWithUser(username: string): any {
    return this.activeRooms.find(room => 
      room.participants.includes(username) &&
      room.participants.includes(this.currentUser)
    );
  }

  selectUser(username: string): void {
    this.selectedUser = username;

    const existingRoom = this.getRoomWithUser(username);

    if(existingRoom){
      this.socketService.joinRoom(existingRoom.roomId);
    }
    else {
      this.socketService.createRoom(username);
    }

  }


}
