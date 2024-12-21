import { useContext, useRef } from "react"
import AnimationWrapper from "../common/page-animation"
import InputBox from "../components/input.component"
import googleIcon from "../imgs/google.png"
import {Link, Navigate} from 'react-router-dom'
import {Toaster, toast} from 'react-hot-toast'
import axios from 'axios';
import { storeInSession } from "../common/session"
import { UserContext } from "../App"
import { authWithGoogle } from "../common/firebase"



const UserAuthForm = ({type}) => {

    let { userAuth: { access_token }, setUserAuth } = useContext(UserContext)

    const userAuthThroughServer = (serverRoute, formData) => {

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
        .then(({ data }) => {
            if(serverRoute === "/signup"){
                toast.success("Email verifikasi berhasil dikirim cek di pesan di inbox")
            }else{
                storeInSession("user", JSON.stringify(data));
                localStorage.setItem("user", JSON.stringify(data));
                setUserAuth(data)
            }

        })
        .catch(({ response }) => {
            toast.error(response.data.error)
        })
    }

    let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
    let nimRegex = /^213051\d{3}$/; // regex form nim
    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

    const handleSubmit = (e) => {

        e.preventDefault();

        let serverRoute = type == 'sign-in' ? '/signin' : '/signup'

        // formData
        let form = new FormData(formElement);
        let formData = {};

        for(let [key, value] of form.entries()){
            formData[key] = value;
        }

        let { fullname, email, nim, password } = formData;

        // validating data from frontend
        if(fullname){
            if(fullname.length < 3){
                return toast.error("Nama lengkap harus terdiri dari minimal 3 huruf")
            }
        }
    
        if(!email.length){
            return toast.error("Masukan Surel")
        }
        
        if(!emailRegex.test(email)){
            return toast.error("Surel tidak valid")
        }
    
        if(!nim.length){
            return toast.error("Masukan NIM")
        }

        if(!nimRegex.test(nim)){
            return toast.error("Nim tidak terdaftar")
        }
    
        if(!passwordRegex.test(password)){
            return toast.error("Kata sandi harus terdiri dari 6 hingga 20 karakter dengan setidaknya satu angka, satu huruf kecil, dan satu huruf besar")
        }


        userAuthThroughServer(serverRoute, formData)
    }

    const handleGoogleAuth = (e) => {

        e.preventDefault();

        authWithGoogle().then( user => {
            
            let serverRoute = "/google-auth"

            let formData = {
                access_token: user.accessToken
            }

            userAuthThroughServer(serverRoute, formData)

        })
        .catch(err => {
            toast.error('Masalah Login Melalui Google')
            return console.log(err)
        })
    }

    return (
        access_token ? 
        <Navigate to="/" />
        :
      <AnimationWrapper keyValue={type}>
        <section className="h-cover flex items-center justify-center">
            <Toaster />
            <form id="formElement" className="w-[80%] max-w-[400px]">
                <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
                    {type == 'sign-in' ? 'Selamat datang kembali' : 'Mulai Bergabung'}
                </h1>

                {
                    type != "sign-in" ? 
                    <InputBox
                        name="fullname"
                        type="text"
                        placeholder="Nama Lengkap"
                        icon="fi-rr-user"
                    />
                    : ""
                }

                <InputBox 
                    name="email"
                    type="email"
                    placeholder="Surel"
                    icon="fi-rr-envelope"
                />
                <InputBox 
                    name="nim"
                    type="text"
                    pattern="[0-9]*"
                    placeholder="NIM"
                    icon="fi-rr-id-badge"
                />

                <InputBox
                    name="password"
                    type="password"
                    placeholder="Kata sandi"
                    icon="fi-rr-key"
                />

                <button
                    className="btn-dark center mt-14"
                    type="submit"
                    onClick={handleSubmit}
                >
                    {type == 'sign-in' ? "Masuk" : "Daftar"}
                </button>

                <div className="relative w-full flex items-center gap-2 my-10 opacity-25 text-black uppercase font-bold">
                    <hr className="w-1/2 border-black"/>
                    <p>or</p>
                    <hr className="w-1/2 border-black"/>
                </div>

                <button className="btn-dark flex items-center justify-center gap-4 w-[90%] center"
                    onClick={handleGoogleAuth}
                >
                    <img src={googleIcon} className="w-5" />
                    Lanjutkan dengan google
                </button>

                {
                    type == "sign-in" ? 
                    <p className="mt-6 text-dark-grey text-xl text-center">
                        Belum punya akun ?
                        <Link to="/signup" className="underline text-black text-xl ml-1">
                            Bergabung sekarang
                        </Link>
                    </p>
                    :
                    <p className="mt-6 text-dark-grey text-xl text-center">
                        Sudah menjadi anggota ?
                        <Link to="/signin" className="underline text-black text-xl ml-1">
                            Masuk disini
                        </Link>
                    </p>
                }
            </form>
        </section>
      </AnimationWrapper>
    )
}

export default UserAuthForm