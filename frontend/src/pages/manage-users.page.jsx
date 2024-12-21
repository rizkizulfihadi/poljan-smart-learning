import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster } from "react-hot-toast";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import { ManageUsersCard, ManageSuspendUsersCard } from "../components/manage-userscard.component";
import LoadMoreDataBtn from "../components/load-more.component";
import { useSearchParams } from "react-router-dom";

const ManageUsers = () => {

    const [ users, setUsers ] = useState(null);
    const [ admins, setAdmins ] = useState(null);
    const [ suspendUsers, setSuspendUsers ] = useState(null);
    const [ query, setQuery ] = useState("");

    let activeTab = useSearchParams()[0].get("tab")

    let { userAuth: { access_token } } =  useContext(UserContext);

    const getUsers = ({ page, admin, deletedDocCount = 0, suspend }) => {

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/all-users", {
            page, admin, query, deletedDocCount, suspend
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(async ({ data }) => {
            
            let formatedData = await filterPaginationData({
                state: admin ? admins : (suspend ? suspendUsers : users),
                data: data.users,
                page,
                user: access_token,
                countRoute: "/all-users-count",
                data_to_send: {admin, query, suspend}
            })
    
            if(admin){
                setAdmins(formatedData);
            }else if(suspend){
                setSuspendUsers(formatedData);
            }else{
                setUsers(formatedData);
            }
    
        })
        .catch(err => {
            console.log(err)
        })
    }

    useEffect(() => {
        if(users == null){
            getUsers({ page: 1, admin: false, suspend: false })
        }
        if(admins == null){
            getUsers({ page: 1, admin: true, suspend: true })
        }
        if(suspendUsers == null){
            getUsers({ page: 1, admin: false, suspend: true })
        }
    }, [access_token, users, admins, suspendUsers, query])

    const handleSearch = (e) => {
        let searchQuery = e.target.value;

        setQuery(searchQuery);

        if(e.keyCode == 13 && searchQuery.length){
            setUsers(null);
            setAdmins(null);
            setSuspendUsers(null);
        }
    }

    const handleChange = (e) => {
        if(!e.target.value.length){
            setQuery("");
            setUsers(null);
            setAdmins(null);
            setSuspendUsers(null);
        }
    }

    

    return (
        <>
            <h1 className="max-md:hidden">Kelola Pengguna</h1>

            <Toaster />

            <div className="relative max-md:mt-5 md:mt-8 mb-10">
                <input 
                    type="search" 
                    className="w-full bg-grey p-4 pl-12 pr-6 rounded-full placeholder:text-dark-grey"
                    placeholder="Cari Pengguna"
                    onChange={handleChange}
                    onKeyDown={handleSearch}
                />
                <i className="fi fi-rr-search absolute right-[10%] md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-dark-grey"></i>
            </div>
            <InpageNavigation routes={["Semua Pengguna", "Ditangguhkan"]} defaultActiveIndex={ activeTab === 'Ditangguhkan' ?  1 : 0}>
                { // all users
                    users == null ? <Loader /> :
                    users.results.length ? 
                        <>
                        {
                            users.results.map((user, i) => {
                                return <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                    <ManageUsersCard user={{ ...user, index: i, setStateFunc: setUsers }} />
                                    
                                </AnimationWrapper>
                            })
                        }

                        <LoadMoreDataBtn state={users} fetchDataFun={getUsers} additionalParam={{ admin: false, suspend: false, deletedDocCount: users.deletedDocCount }} />
                        </>
                    : <NoDataMessage message="Belum ada pengguna" />
                }

              

                { // suspend users
                    suspendUsers == null ? <Loader /> :
                    suspendUsers.results.length ? 
                        <>
                        {
                            suspendUsers.results.map((user, i) => {
                                return <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                    <ManageSuspendUsersCard user={{ ...user, index: i, setStateFunc: setSuspendUsers }} />
                                    
                                </AnimationWrapper>
                            })
                        }

                        <LoadMoreDataBtn state={suspendUsers} fetchDataFun={getUsers} additionalParam={{ admin: false, suspend: true, deletedDocCount: suspendUsers.deletedDocCount }} />
                        </>
                    : <NoDataMessage message="Belum ada pengguna yang ditangguhkan" />
                }
            </InpageNavigation>
        </>
    )
}

export default ManageUsers