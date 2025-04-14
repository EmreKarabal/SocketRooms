import { Component, OnInit } from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit{
  
  username = '';
  errorMessage = '';
  
  constructor(
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {

    this.socketService.onLoginSuccess().subscribe(username => {
      console.log('Giriş başarılı: ', username);
      this.router.navigate(['/chat']);
    });

    this.socketService.onLoginError().subscribe(error => {
      this.errorMessage = error;
    });
    
  }


  onLogin(): void {
    if(this.username.trim()){
      console.log('Login attempt with: ', this.username.trim());
      this.socketService.login(this.username.trim());
    }
    else {
      this.errorMessage = 'Lütfen kullanıcı adı girin';
    }
  }


}
