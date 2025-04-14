import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ChatComponent } from './components/chat/chat.component';
import { UserListComponent } from './components/user-list/user-list.component';
import { ChatAreaComponent } from './components/chat-area/chat-area.component';
import { SocketService } from './services/socket.service';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ChatComponent,
    UserListComponent,
    ChatAreaComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    SocketService,
    //provideClientHydration(withEventReplay())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
