import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  avatar?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    DatePipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.less'
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  readonly botAvatar = 'https://raw.githubusercontent.com/taiga-family/taiga-ui/main/projects/demo/src/assets/images/avatar.jpg';

  ngOnInit() {
    this.messages.push({
      text: 'Здравствуйте! Чем я могу вам помочь?',
      isUser: false,
      timestamp: new Date(),
      avatar: this.botAvatar
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  adjustTextarea(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 150);
    textarea.style.height = `${newHeight}px`;
  }

  sendMessage(): void {
    if (this.currentMessage.trim()) {
      // Добавляем сообщение пользователя
      this.messages.push({
        text: this.currentMessage,
        isUser: true,
        timestamp: new Date()
      });

      const userMessage = this.currentMessage;
      this.currentMessage = '';

      // Сбрасываем высоту текстового поля
      const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = '44px';
      }

      // Эмулируем задержку ответа бота
      setTimeout(() => {
        this.messages.push({
          text: 'Прошу прощения, пока что не могу ответить на ваш вопрос',
          isUser: false,
          timestamp: new Date(),
          avatar: this.botAvatar
        });
        this.scrollToBottom();
      }, 500);
    }
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
