import { useContext, useEffect, useRef, useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { profileDataStructure } from "./profile.page";
import AnimationWrapper from "../common/page-animation";
import { Toaster, toast } from "react-hot-toast";
import Loader from "../components/loader.component";
import InputBox from "../components/input.component";
import { uploadImage } from "../common/aws";
import { storeInSession } from "../common/session";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../confirm-alert.css'; 
import { removeFromSession, } from "../common/session"


const EditProfile = () => {

    let { userAuth, userAuth: { access_token, isAdmin  }, setUserAuth } = useContext(UserContext);

    const bioLimit = 150;

    const profileImgEle = useRef();
    const editProfileForm = useRef();

    const [profile, setProfile] = useState(profileDataStructure);
    const [loading, setLoading] = useState(true);
    const [characterLeft, setCharacterLeft] = useState(bioLimit);
    const [updateProfileImg, setUpdateProfileImg] = useState(null);

    const { personal_info: { fullname, username: profile_username, profile_img, email, bio }, social_links } = profile;

    useEffect(() => {
        if (access_token) {
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", { username: userAuth.username })
                .then(({ data }) => {
                    setProfile(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }, [access_token, userAuth.username]);

    const handleCharacterChange = (e) => {
        setCharacterLeft(bioLimit - e.target.value.length);
    }

    const handleImagePreview = (e) => {
        const img = e.target.files[0];
        profileImgEle.current.src = URL.createObjectURL(img);
        setUpdateProfileImg(img);
    }

    const handleImageUpload = (e) => {
        e.preventDefault();

        if (updateProfileImg) {
            const loadingToast = toast.loading("Uploading...");
            e.target.setAttribute("disabled", true);

            uploadImage(updateProfileImg)
                .then(url => {
                    if (url) {
                        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/update-profile-img", { url }, {
                            headers: {
                                'Authorization': `Bearer ${access_token}`
                            }
                        })
                            .then(({ data }) => {
                                const newUserAuth = { ...userAuth, profile_img: data.profile_img };

                                storeInSession("user", JSON.stringify(newUserAuth));
                                setUserAuth(newUserAuth);

                                setUpdateProfileImg(null);

                                toast.dismiss(loadingToast);
                                e.target.removeAttribute("disabled");
                                toast.success("Uploaded 👌");
                            })
                            .catch(({ response }) => {
                                toast.dismiss(loadingToast);
                                e.target.removeAttribute("disabled");
                                toast.error(response.data.error);
                            });
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const form = new FormData(editProfileForm.current);
        const formData = {};

        for (let [key, value] of form.entries()) {
            formData[key] = value;
        }

        const { username, bio, youtube, facebook, twitter, github, instagram, website } = formData;

        if (username.length < 3) {
            return toast.error("Username harus memiliki setidaknya 3 huruf");
        }

        if (bio.length > bioLimit) {
            return toast.error(`Bio tidak boleh lebih dari ${bioLimit}`);
        }

        let loadingToast = toast.loading("Memperbarui....");
        e.target.setAttribute("disabled", true);

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/update-profile", {
            username, bio,
            social_links: { youtube, facebook, twitter, github, instagram, website }
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(({ data }) => {
            if(userAuth.username != data.username){
                let newUserAuth = { ...userAuth, username: data.username };
                storeInSession("user", JSON.stringify(newUserAuth));
                setUserAuth(newUserAuth);
            }

            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            toast.success("profile diperbarui")
        })
        .catch(({ response }) => {
            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            toast.error(response.data.error);
        })
    }

    const confirmDeleteUser = () => {
        confirmAlert({
            customUI: ({ onClose }) => {
                return (
                    <div className='p-8 rounded-lg shadow-lg bg-white text-dark'>
                        <h1 className="text-2xl font-semibold mb-4">Konfirmasi Penghapusan</h1>
                        <p className="mb-6">Apakah Anda yakin ingin menghapus permanen akun ini ? </p>
                        <div className="flex justify-end">
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                                onClick={onClose}
                            >
                            Tidak
                            </button>
                            <button
                                className="bg-rose-500 text-white px-4 py-2 rounded hover:bg-rose-600"
                                onClick={() => {
                                    deleteUser()
                                    onClose(); 
                                }}
                            >
                                Ya
                            </button>
                        </div>
                    </div>
                );
            }
        });
    };

    const deleteUser = async () => {
        try {
            const response = await axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/delete-account`, {}, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });
    
            if (response.status === 200) {
                removeFromSession("user");
                setUserAuth({ access_token: null });
                // Handle success
                toast.success('Akun berhasil dihapus ');
                // Redirect to /signin page
                window.location.href = '/signin';
                
            } else {
                // Handle other status codes if needed
                console.error('Failed to delete account:', response.data);
                toast.error('Failed to delete account. Please try again later.');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Error deleting account. Please try again later.');
        }
    };
    
    
  

    return (
        <AnimationWrapper>
            {loading ? <Loader /> :
                <form ref={editProfileForm}>
                    <Toaster />
                    <h1 className="max-md:hidden">Ubah Profile</h1>
                    <div className="flex flex-col lg:flex-row items-start py-10 gap-8 lg:gap-10">

                        <div className="max-lg:center mb-5">
                            <label htmlFor="uploadImg" id="profileImgLable" className="relative block w-48 h-48 bg-grey rounded-full overflow-hidden">
                                <div className="w-full h-full absolute top-0 left-0 flex items-center justify-center text-white bg-black/80 opacity-0 hover:opacity-100 cursor-pointer">
                                    Upload Image
                                </div>
                                <img ref={profileImgEle} src={profile_img} />
                            </label>
                            <input type="file" id="uploadImg" accept=".jpeg, .png, .jpg" hidden onChange={handleImagePreview} />
                            <button className="btn-light mt-5 max-lg:center lg:w-full px-10" onClick={handleImageUpload}>Upload</button>
                        </div>

                        <div className="w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-5">
                                <div>
                                    <InputBox name="fullname" type="text" value={fullname} placeholder="Full Name" disable={true} icon="fi-rr-user" />
                                </div>
                                <div>
                                    <InputBox name="email" type="email" value={email} placeholder="Email" disable={true} icon="fi-rr-envelope" />
                                </div>
                            </div>
                            <InputBox name="username" type="text" value={profile_username} placeholder="Username" icon="fi-rr-at" />

                            <p className="text-dark-grey -mt-3">Username digunakan untuk mencari pengguna dan terlihat oleh semua pengguna</p>

                            <textarea name="bio" maxLength={bioLimit} defaultValue={bio} className="input-box h-64 lg:h-40 resize-none leading-7 mt-5 pl-5" placeholder="Bio" onChange={handleCharacterChange}></textarea>
                            <p>{characterLeft} karakter tersisa</p>

                            <p className="my-6 text-dark-grey">Tambahkan tautan media sosial Anda di bawah ini</p>

                            <div className="md:grid md:grid-cols-2 gap-x-6">
                                {Object.keys(social_links).map((key, i) => {
                                    const link = social_links[key];
                                    return <InputBox key={i} name={key} type="text" value={link} placeholder="https://" icon={"fi " + (key !== 'website' ? "fi-brands-" + key : "fi-rr-globe")} />;
                                })}
                            </div>
                            
                            <div className="flex mt-4">
                                <button className="btn-dark w-auto px-10 mr-3" type="submit" onClick={handleSubmit}>Perbarui</button>
                                {!isAdmin && 
                                <div className="flex">
                                    <div className="bg-rose-600 text-white hover:bg-rose-700 w-auto px-10 py-2 ml-3 cursor-pointer rounded-full flex items-center justify-center" onClick={confirmDeleteUser}>
                                        Hapus Akun
                                    </div>
                                </div>
            }
                            </div>
                        </div>

                    </div>
                </form>
            }

          
           
        </AnimationWrapper>
    );
}

export default EditProfile;
