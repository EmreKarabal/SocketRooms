import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket} from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket: Socket;
  public currentUser: string | null = null;

  constructor() { 
    this.socket = io('http://localhost:3000' , {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Socket bağlantısı kuruldu: ', this.socket.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket bağlantı hatası: ', error);
    });

  }


  login(username: string): void {
    this.socket.emit('register', username);
    this.currentUser = username;
  }

  getUserList(): Observable<string[]> {
    return new Observable<string[]>(observer => {
      this.socket.on('userList', (users: string[]) => {
        observer.next(users);
      });
    });
  }

  onLoginSuccess(): Observable<string> {
    return new Observable<string>(observer => {
      this.socket.on('register_success', (username: string) => {
        this.currentUser = username;
        observer.next(username);
      });
    });
  }

  onLoginError(): Observable<string>{
    return new Observable<string>(observer => {
      this.socket.on('register_error', (errorMessage: string) => {
        observer.next(errorMessage);
      });
    });
  }

  createRoom(username: string): void {
    this.socket.emit('createRoom', username);
  }

  joinRoom(roomId: string): void {
    this.socket.emit('joinRoom', roomId);
  }

  onRoomCreated(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on('roomCreated', (roomData: any) => {
        observer.next(roomData);
      });
    });
  }

  getUserRooms(): void {
    this.socket.emit('getUserRooms');
  }

  onUserRooms(): Observable<any[]> {
    return new Observable<any[]>(observer => {
      this.socket.on('userRooms', (rooms: any[]) => {
        observer.next(rooms);
      });
    });
  }

  sendMessage(roomId: string, message: string): void {
    this.socket.emit('sendMessage', {
      roomId: roomId,
      message: message
    });
  }

  onNewMessage(): Observable<any> {
    return new Observable<any>(observer => {
      this.socket.on('newMessage', (message: any) => {
        observer.next(message);
      });
    });
  }

  disconnect(): void{
    if(this.socket){
      this.socket.disconnect();
    }
  }

}
