import { Link } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { UserContext, ThemeContext } from "../App";
import { removeFromSession } from "../common/session";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../confirm-alert.css'; 

const UserNavigationPanel = () => {
    const { userAuth: { username, isAdmin }, setUserAuth } = useContext(UserContext);
    const { theme } = useContext(ThemeContext); 

    const signOutUser = () => {
        confirmAlert({
            customUI: ({ onClose }) => {
                return (
                    <div className={`p-8 rounded-lg shadow-lg ${theme === 'dark' ? 'bg-gray-800 text-light' : 'bg-white text-dark'}`}>
                        <h1 className="text-2xl font-semibold mb-4">Konfirmasi Untuk Keluar</h1>
                        <p className="mb-6">Apakah anda yakin ingin keluar dari akun anda ?</p>
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
                                    removeFromSession("user");
                                    setUserAuth({ access_token: null });
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

    return (
        <AnimationWrapper
            classsName="absolute right-0 z-50"
            transition={{ duration: 0.2 }}
        >
            <div className="bg-white absolute right-0 border border-grey w-60 duration-200">
                {
                    isAdmin ? "" :
                    <Link to="/editor" className="flex gap-2 link md:hidden pl-8 py-4">
                        <i className="fi fi-rr-file-edit"></i>
                        <p>Menulis</p>
                        </Link>
                }
                

                <Link to={`/user/${username}`} className="link pl-8 py-4">
                    Profile
                </Link>

                {
                    isAdmin ?
                    <Link to={`/dashboard/manage-blogs`} className="link pl-8 py-4">
                        Dasbor
                    </Link> :
                    <Link to={`/dashboard/blogs`} className="link pl-8 py-4">
                        Dasbor
                    </Link>


                }

                <Link to="/settings/edit-profile" className="link pl-8 py-4">
                    Pengaturan
                </Link>

                <span className="absolute border-t border-grey w-[100%]"></span>
                <button className="text-left p-4 hover:bg-grey w-full pl-8 py-4"
                    onClick={signOutUser}
                >
                    <h1 className="font-bold text-xl mg-1">Keluar</h1>
                    <p className="text-dark-grey">@{username}</p>
                </button>
            </div>

        </AnimationWrapper>
    );
};

export default UserNavigationPanel;
