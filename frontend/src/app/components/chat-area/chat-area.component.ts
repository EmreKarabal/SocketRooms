import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../../services/socket.service';




interface Message{
  sender: string;
  text: string;
  timestamp: Date;
}


@Component({
  selector: 'app-chat-area',
  standalone: false,
  templateUrl: './chat-area.component.html',
  styleUrl: './chat-area.component.css'
})

export class ChatAreaComponent implements OnInit, AfterViewChecked{
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  currentRoom: any = null;
  messages: Message[] = [];
  newMessage = '';
  currentUser: string | null = null;
  chatWithUser: string | null = null;


  constructor(private socketService: SocketService) {}
  
  scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.log('scroll error');
    }
  }
  
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnInit(): void {
    this.currentUser = this.socketService.currentUser;

    this.socketService.onRoomCreated().subscribe(roomData => {
      this.currentRoom = roomData;
      this.messages = roomData.messages ? roomData.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })) : [];

      this.chatWithUser = roomData.participants.find(
        (user: string) => user !== this.currentUser
      );

    });


    this.socketService.onNewMessage().subscribe(message => {
      this.messages.push({
        ...message,
        timestamp: new Date(message.timestamp)
      });
    });
  }

  sendMessage(): void {
    if(this.newMessage.trim() && this.currentRoom){
      this.socketService.sendMessage(this.currentRoom.roomId, this.newMessage.trim());
      this.newMessage = '';
    }
  }

  formatTime(date: Date): string{
    return date ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : '';
  }
  

}
