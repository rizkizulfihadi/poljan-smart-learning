import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster } from "react-hot-toast";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import { ManageNonActiveBlogCard, ManagePublishedBlogCard } from "../components/manage-blogcard-admin.component";
import LoadMoreDataBtn from "../components/load-more.component";
import { useSearchParams } from "react-router-dom";

const ManageBlogsAdmin = () => {

    const [ blogs, setBlogs ] = useState(null);
    const [ drafts, setDrafts ] = useState(null);
    const [  nonActiveBlogs, setNonActiveBlogs ] = useState(null);
    const [ query, setQuery ] = useState("");

    let activeTab = useSearchParams()[0].get("tab")

    let { userAuth: { access_token } } =  useContext(UserContext);

    const getBlogs = ({ page, draft, deletedDocCount = 0, active }) => {

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/all-written-blogs", {
            page, draft, query, deletedDocCount, active
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(async ({ data }) => {
            
            let formatedData = await filterPaginationData({
                state: draft ? drafts : (active ? blogs : nonActiveBlogs),
                data: data.blogs,
                page,
                user: access_token,
                countRoute: "/all-written-blogs-count",
                data_to_send: {draft, query, active}
            })
    
            if(draft){
                setDrafts(formatedData);
            }else if(active){
                setBlogs(formatedData);
            }else{
                setNonActiveBlogs(formatedData);
            }
    
        })
        .catch(err => {
            // console.log(err)
        })
    }

    useEffect(() => {
        if(blogs == null){
            getBlogs({ page: 1, draft: false, active: true })
        }
        if(drafts == null){
            getBlogs({ page: 1, draft: true, active: true })
        }
        if(nonActiveBlogs == null){
            getBlogs({ page: 1, draft: false, active: false })
        }
    }, [access_token, blogs, drafts, nonActiveBlogs, query])

    const handleSearch = (e) => {
        let searchQuery = e.target.value;

        setQuery(searchQuery);

        if(e.keyCode == 13 && searchQuery.length){
            setBlogs(null);
            setDrafts(null);
            setNonActiveBlogs(null);
        }
    }

    const handleChange = (e) => {
        if(!e.target.value.length){
            setQuery("");
            setBlogs(null);
            setDrafts(null);
            setNonActiveBlogs(null);
        }
    }


    return (
        <>
            <h1 className="max-md:hidden">Kelola Artikel</h1>

            <Toaster />

            <div className="relative max-md:mt-5 md:mt-8 mb-10">
                <input 
                    type="search" 
                    className="w-full bg-grey p-4 pl-12 pr-6 rounded-full placeholder:text-dark-grey"
                    placeholder="Cari artikel"
                    onChange={handleChange}
                    onKeyDown={handleSearch}
                />
                <i className="fi fi-rr-search absolute right-[10%] md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-dark-grey"></i>
            </div>
            <InpageNavigation routes={["Artikel diterbitkan", "Ditangguhkan"]} defaultActiveIndex={ activeTab === 'Ditangguhkan' ?  1 : 0}>
                { // published blogs
                    blogs == null ? <Loader /> :
                    blogs.results.length ? 
                        <>
                        {
                            blogs.results.map((blog, i) => {
                                return <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                    <ManagePublishedBlogCard blog={{ ...blog, index: i, setStateFunc: setBlogs }} />
                                    
                                </AnimationWrapper>
                            })
                        }

                        <LoadMoreDataBtn state={blogs} fetchDataFun={getBlogs} additionalParam={{ draft: false, active: true, deletedDocCount: blogs.deletedDocCount }} />
                        </>
                    : <NoDataMessage message="Belum ada artikel yang diterbitkan" />
                }

              

                { // non active blogs
                    nonActiveBlogs == null ? <Loader /> :
                    nonActiveBlogs.results.length ? 
                        <>
                        {
                            nonActiveBlogs.results.map((blog, i) => {
                                return <AnimationWrapper key={i} transition={{ delay: i * 0.04 }}>
                                    <ManageNonActiveBlogCard blog={{ ...blog, index: i, setStateFunc: setNonActiveBlogs }} />
                                    
                                </AnimationWrapper>
                            })
                        }

                        <LoadMoreDataBtn state={nonActiveBlogs} fetchDataFun={getBlogs} additionalParam={{ draft: false, active: false, deletedDocCount: nonActiveBlogs.deletedDocCount }} />
                        </>
                    : <NoDataMessage message="Belum ada artikel yang ditangguhkan" />
                }
            </InpageNavigation>
        </>
    )
}

export default ManageBlogsAdmin