import { v4 as uuidv4 } from 'uuid';
import { initModal } from './main';

export class User{
   private id:string
   private mail:string
   private username:string
   protected hashedPassword:string ="passwordByDefault"

   public constructor (mail:string,username:string,password?:string,id?:string){
      if (id == undefined){
         this.id = uuidv4();
      }else{
         this.id = id;
      }
      this.mail = mail;
      this.username = username;
      if (password !== undefined) {
         this.init(password);
     }
   }

   private async init(password:string){
      try{
         this.hashedPassword = await this.setHashedPassword(password);
         this.register();
         }catch(error){
         alert("Une erreur est survenu durant la connexion au serveur")
         throw error;
      }
   }

   private async setHashedPassword(clearPassword:string):Promise<string>{
      //TO DO
      try {
         const response = await fetch('http://localhost:1956/crypt', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clearPassword })
            });
            if (!response.ok) {
               throw new Error('Network response was not ok');
            }
            const data = await response.json();
            let returnPassword:string = data.hashedPassword;
            return returnPassword;

            } catch (error) {
                throw error;
            }
   }

   protected get _hashedPassword(){
      return this.hashedPassword;
   }

   public get _username(){
      return this.username;
   }

   public get _id(){
      return this.id;
   }
   public get _mail(){
      return this.mail;
   }

   private async register():Promise<string>{
      try {
         const response = await fetch('http://localhost:1956/register', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json'
            },
            body: JSON.stringify({
               mail: this.mail,
               username: this.username,
               password: this.hashedPassword,
               id: this.id
             })
            });
            if (!response.ok) {
               throw new Error('Network response was not ok');
            }
            if (response.ok){
               return "inscription réussi";
            }
            else{
               return "inscription échoué";
            }
            } catch (error) {
                throw error;
            }
   }


}
var user:User;

export function initConnectListener():void{
   // Init button Modal
   let connectButton:HTMLElement = document.getElementById("connect")!;
   let loginModal:HTMLElement = document.getElementById("connectModal")!;
   connectButton.addEventListener("click", () => initModal(loginModal));

   let registerButton:HTMLElement = document.getElementById("register")!;
   let registerModal:HTMLElement = document.getElementById("registerModal")!;
   registerButton.addEventListener("click", () => initModal(registerModal));

   // Init button login


   let inputConnectButton:HTMLElement = document.getElementById("loginButton")!;

   inputConnectButton.addEventListener("click", async () => {
      let passwordValue:string = (document.getElementById("passwordInput") as HTMLInputElement).value;
      let mailValue:string = (document.getElementById("mailInput") as HTMLInputElement).value;
      console.log (mailValue,passwordValue);
      user = await login(mailValue,passwordValue);
      console.log(user._id,user._mail,user._username);
   });

   let validateRegister:HTMLElement = document.getElementById("registerButton")!;

   validateRegister.addEventListener("click", async () => {
      let passwordValue:string = (document.getElementById("passwordInputR") as HTMLInputElement).value;
      let mailValue:string = (document.getElementById("mailInputR") as HTMLInputElement).value;
     // TO DO
      console.log (mailValue,passwordValue);
      user = await login(mailValue,passwordValue);
      console.log(user._id,user._mail,user._username);
   });
}

export async function login(mail:string, password:string):Promise<User>{
   try {
      const response = await fetch('http://localhost:1956/login', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json'
         },
         body: JSON.stringify({
            mail: mail,
            password: password,
          })
         });
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         if (response.ok){
            const data = await response.json();
            return new User(data.email,data.name,undefined, data.id);
         }
         else{
            throw "Connexion échoué";
         }
         } catch (error) {
             throw error;
         }
      
}
