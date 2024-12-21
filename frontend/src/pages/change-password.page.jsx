import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import { useContext, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import axios from 'axios'
import {UserContext} from "../App"

const ChangePassword = () => {

    let { userAuth: {access_token} } = useContext(UserContext)

    let ChangePasswordForm = useRef();

    let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

    const handleSubmit = (e) => {
        e.preventDefault();

        let form = new FormData(ChangePasswordForm.current) ;
        let formData = {}

        for(let [key, value] of form.entries()){
            formData[key] = value
        }

        let { currentPassword, newPassword } = formData;

        if(!currentPassword.length || !newPassword.length){
            return toast.error("Harap isi semua input")
        }

        if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
            return toast.error("Password harus terdiri dari 6 hingga 20 karakter dengan minimal satu angka, satu huruf kecil, dan satu huruf besar")
        }

        e.target.setAttribute("disabled", true);

        let loadingToast = toast.loading("Memperbarui...");

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password", formData, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(() => {
            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            return toast.success("Password telah diperbarui");
        })
        .catch(({ response }) => {
            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            return toast.error(response.data.error);
        })
        
    }

    return (
        <AnimationWrapper>
            <Toaster />
            <form ref={ChangePasswordForm}>
                <h1 className="max-md:hidden">Ganti Kata Sandi</h1>

                <div className="py-10 w-full md:max-w-[400px]">
                    <InputBox name="currentPassword" type="password" className="profile-edit-input" placeholder="Kata sandi saat ini" icon="fi-rr-unlock" />
                    <InputBox name="newPassword" type="password" className="profile-edit-input" placeholder="Kata sandi baru" icon="fi-rr-unlock" />
                    <button onClick={handleSubmit} className="btn-dark px-10" type="submit">Perbarui</button>
                </div>
            </form>
        </AnimationWrapper>
    )
}

export default ChangePassword;