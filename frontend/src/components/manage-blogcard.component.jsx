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
                    <p className="max-lg:text-dark-grey capitalize">{key.split("_")[1]}</p>
                </div> : ""
                })
            }
        </div>
    )
}


export const ManagePublishedBlogCard = ({ blog }) => {

    let { banner, blog_id, title, publishedAt, activity } = blog;
    let { userAuth: { access_token } } = useContext(UserContext)


    let [ showStat, setShowStat ] = useState(false)


    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">

                <img src={banner} alt="banner" className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover" />

                <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/blog/${blog_id}`} className="blog-title mb-4 hover:underline">{title}</Link>
                        <p className="line-clamp-1">Diterbitkan pada {getFullDay(publishedAt)}</p>
                        <div className="flex gap-6 mt-3">
                            <Link to={`/editor/${blog_id}`} className="pr-4 py-2 underline">Ubah</Link>

                            <button className="lg:hidden pr-4 py-2 underline" onClick={() => setShowStat(preval => !preval)}>Statistik</button>
                            
                            <button className="pr-4 py-2 underline text-red" onClick={(e) => confirmDeleteBlog(blog, access_token, e.target)}>Hapus</button>
                        </div>
                    </div>
                </div>

                <div className="max-lg:hidden">
                    <BlogStats stats={activity} />
                </div>

            </div>

            {
                showStat ? <div className="lg:hidden"><BlogStats stats={activity}/></div> : ""
            }
        </>
    )
}

export const ManageDraftBlogPost = ({ blog }) => {

    let { title, desc, blog_id, index } = blog;

    let { userAuth: {access_token} } = useContext(UserContext);

    

    return (
        <div className="flex gap-5 lg:gap-10 pb-6 border-b mb-6 border-grey">
            <h1 className="blog-index text-center pl-4 md:pl-6 flex-none">{index < 10 ? "0" + index : index}</h1>

            <div>
                <h1 className="blog-title mb-3">{title}</h1>
                <p className="line-clamp-2 font-gelasio">{desc.length ? desc : "Tidak ada deskripsi"}</p>

                <div className="flex gap-6 mt-3">
                    <Link to={`/editor/${blog_id}`} className="pr-4 py-2 underline">Ubah</Link>
                    <button className="pr-4 py-2 underline text-red" onClick={(e) => confirmDeleteBlog(blog, access_token, e.target)}>Hapus</button>
                </div>
            </div>

        </div>
    )
}

export const ManageNonActiveBlogCard = ({ blog }) => {

    let { banner, blog_id, title, updatedAt, activity } = blog;
    let { userAuth: { access_token } } = useContext(UserContext)


    let [ showStat, setShowStat ] = useState(false)


    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">

                <img src={banner} alt="banner" className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover" />

                <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/blog/${blog_id}`} className="blog-title mb-4 hover:underline">{title}</Link>
                        <p className="line-clamp-1">Ditangguhkan pada {getFullDay(updatedAt)}</p>
                        <div className="flex gap-6 mt-3">                            
                            
                            <button className="lg:hidden pr-4 py-2 underline" onClick={() => setShowStat(preval => !preval)}>Statistik</button>
                            
                            <button className="pr-4 py-2 underline text-red" onClick={(e) => confirmDeleteBlog(blog, access_token, e.target)}>Hapus</button>
                        </div>
                    </div>
                </div>

                <div className="max-lg:hidden">
                    <BlogStats stats={activity} />
                </div>

            </div>

            {
                showStat ? <div className="lg:hidden"><BlogStats stats={activity}/></div> : ""
            }
        </>
    )
}

const confirmDeleteBlog = (blog, access_token, target) => {
    confirmAlert({
        customUI: ({ onClose }) => {
            return (
                <div className='p-8 rounded-lg shadow-lg bg-white text-dark'>
                    <h1 className="text-2xl font-semibold mb-4">Konfirmasi Penghapusan</h1>
                    <p className="mb-6">Apakah Anda yakin ingin menghapus data ini ? </p>
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
                                deleteBlog(blog, access_token, target);
                                onClose(); // Memanggil onClose setelah deleteBlog selesai
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

const deleteBlog = (blog, access_token, target) => {

    let { index, blog_id, setStateFunc } = blog;

    target.setAttribute("disabled", true);

    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/delete-blog", {blog_id}, {
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