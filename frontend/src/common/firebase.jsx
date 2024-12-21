import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC7qKY3YX3XnDVaDlq-jmtKUI_UAoL2UZo",
  authDomain: "react-js-blog-web-729d4.firebaseapp.com",
  projectId: "react-js-blog-web-729d4",
  storageBucket: "react-js-blog-web-729d4.appspot.com",
  messagingSenderId: "187940232484",
  appId: "1:187940232484:web:3f2d1fe69f5d78b853a7b1"
};

const app = initializeApp(firebaseConfig);

// google auth

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account'
})

const auth = getAuth();

export const authWithGoogle = async () => {
    let user = null;

    await signInWithPopup(auth, provider)
    .then((result) => {
        user = result.user
    })
    .catch((err) => {
        console.log(err)
    })

    return user;
}