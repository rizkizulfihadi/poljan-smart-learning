import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";
import { useContext, useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../confirm-alert.css'; 



const BlogStats = ({ stats }) => {
    
    return (
        <div className="flex gap-2 max-lg:mb-6 max-lg:pb-6 border-grey border-b">
            {
                Object.keys(stats).map((key, i) => {
                    return !key.includes("parent") ? <div key={i} className={"flex flex-col items-center w-full h-full justify-center p-4 px-6" + (i != 0 ? " border-grey border-l " : "")}>
                    <h1 className="text-xl lg:text-2xl mb-2">{stats[key].toLocaleString()}</h1>
                    <p className="max-lg:text-dark-grey capitalize whitespace-nowrap">{key.split("_").join(" ")}</p>
                </div> : ""
                })
            }
        </div>
    )
}


export const ManageUsersCard = ({ user }) => {

    let { personal_info, account_info, joinedAt } = user;
    let { userAuth: { access_token } } = useContext(UserContext)

    let [ showStat, setShowStat ] = useState(false)

    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">

                <img src={personal_info.profile_img} alt="banner" className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover rounded-full" />

                 <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/user/${personal_info.username}`} className="blog-title mb-4 hover:underline">@{personal_info.username}</Link>
                        <p>Bergabung pada {getFullDay(joinedAt)}</p>
                        <div className="flex gap-6 mt-3">
                            <Link to={`/user/${personal_info.username}`} className="pr-4 py-2 underline">Lihat Profile</Link>

                            <button className="lg:hidden pr-4 py-2 underline" onClick={() => setShowStat(preval => !preval)}>Statistik</button>
                            
                            <button className="pr-4 py-2 underline text-red" onClick={(e) => confirmSuspendUser(user, access_token, e.target)}>Tangguhkan</button>

                        </div>
                    </div>
                </div>
                

                <div className="max-lg:hidden">
                    <BlogStats stats={account_info} />
                </div>

            </div>

            {
                showStat ? <div className="lg:hidden"><BlogStats stats={account_info}/></div> : ""
            }
        </>
    )
}

export const ManageSuspendUsersCard = ({ user }) => {

    let { personal_info, account_info, updatedAt } = user;
    let { userAuth: { access_token } } = useContext(UserContext)
    


    let [ showStat, setShowStat ] = useState(false)

    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">

                <img src={personal_info.profile_img} alt="banner" className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover rounded-full" />

                 <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/user/${personal_info.username}`} className="blog-title mb-4 hover:underline">@{personal_info.username}</Link>
                        <p>Ditangguhkan pada {getFullDay(updatedAt)}</p>
                        <div className="flex gap-6 mt-3">
                        <button className="pr-4 py-2 underline text-green-700" onClick={(e) => confirmUnSuspendUser(user, access_token, e.target)}>Buka Tangguhan</button>

                            <button className="lg:hidden pr-4 py-2 underline" onClick={() => setShowStat(preval => !preval)}>Statistik</button>
                            
                            <button className="pr-4 py-2 underline text-red" onClick={(e) => confirmDeleteUser(user, access_token, e.target)}>Hapus Akun</button>

                        </div>
                    </div>
                </div>
                

                <div className="max-lg:hidden">
                    <BlogStats stats={account_info} />
                </div>

            </div>

            {
                showStat ? <div className="lg:hidden"><BlogStats stats={account_info}/></div> : ""
            }
        </>
    )
}


const confirmSuspendUser = (user, access_token, target) => {
    confirmAlert({
        customUI: ({ onClose }) => {
            return (
                <div className='p-8 rounded-lg shadow-lg bg-white text-dark'>
                    <h1 className="text-2xl font-semibold mb-4">Konfirmasi Penangguhan</h1>
                    <p className="mb-6">Apakah Anda yakin ingin menangguhkan pengguna ini ? </p>
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
                                suspendUser(user, access_token, target);
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

const suspendUser = (user, access_token, target) => {

    let { index, _id, setStateFunc } = user;

    target.setAttribute("disabled", true);

    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/suspend-user", {_id}, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(({ data }) => {

        target.removeAttribute('disabled')

        setStateFunc(preval => {

            let { deletedDocCount, totalDocs, results } = preval;

            results.splice(index, 1);

            if(!deletedDocCount){
                deletedDocCount = 0;
            }

            if(!results.length && totalDocs - 1 > 0 ){
                return null;
            }

            console.log({ ...preval, totalDocs: totalDocs - 1, deletedDocCount: deletedDocCount + 1 });
        })
    })
    .catch(err => {
        console.log(err)
    })
    
}

const confirmUnSuspendUser = (user, access_token, target) => {
    confirmAlert({
        customUI: ({ onClose }) => {
            return (
                <div className='p-8 rounded-lg shadow-lg bg-white text-dark'>
                    <h1 className="text-2xl font-semibold mb-4">Konfirmasi Penangguhan</h1>
                    <p className="mb-6">Apakah Anda yakin ingin membuka tangguhan pengguna ini ? </p>
                    <div className="flex justify-end">
                        <button
                            className="bg-gray-500 text-white px-4 py-2 rounded mr-2 hover:bg-gray-600"
                            onClick={onClose}
                        >
                        Tidak
                        </button>
                        <button
                            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                            onClick={() => {
                                unSuspendUser(user, access_token, target);
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

const unSuspendUser = (user, access_token, target) => {

    let { index, _id, setStateFunc } = user;

    target.setAttribute("disabled", true);

    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/unsuspend-user", {_id}, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(({ data }) => {

        target.removeAttribute('disabled')

        setStateFunc(preval => {

            let { deletedDocCount, totalDocs, results } = preval;

            results.splice(index, 1);

            if(!deletedDocCount){
                deletedDocCount = 0;
            }

            if(!results.length && totalDocs - 1 > 0 ){
                return null;
            }

            console.log({ ...preval, totalDocs: totalDocs - 1, deletedDocCount: deletedDocCount + 1 });
        })
    })
    .catch(err => {
        console.log(err)
    })
    
}


const confirmDeleteUser = (user, access_token, target) => {
    confirmAlert({
        customUI: ({ onClose }) => {
            return (
                <div className='p-8 rounded-lg shadow-lg bg-white text-dark'>
                    <h1 className="text-2xl font-semibold mb-4">Konfirmasi Penghapusan</h1>
                    <p className="mb-6">Apakah Anda yakin ingin menghapus permanen pengguna ini ? </p>
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
                                deleteUser(user, access_token, target);
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

const deleteUser = (user, access_token, target) => {

    let { index, setStateFunc, _id } = user;

    target.setAttribute("disabled", true);

    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/delete-user", {_id}, {
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    })
    .then(({ data }) => {


        target.removeAttribute('disabled')

        setStateFunc(preval => {

            let { deletedDocCount, totalDocs, results } = preval;

            results.splice(index, 1);

            if(!deletedDocCount){
                deletedDocCount = 0;
            }

            if(!results.length && totalDocs - 1 > 0 ){
                return null;
            }

            console.log({ ...preval, totalDocs: totalDocs - 1, deletedDocCount: deletedDocCount + 1 });
        })
    })
    .catch(err => {
        console.log(err)
    })
    
}