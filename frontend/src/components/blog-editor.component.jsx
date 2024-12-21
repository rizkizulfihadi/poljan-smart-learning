import darkLogo from '../imgs/logo-dark.png';
import lightLogo from '../imgs/logo-light.png';
import LightBanner from '../imgs/banner-light.png'
import DarkBanner from '../imgs/banner-dark.png'
import { Link, useNavigate, useParams } from "react-router-dom";
import AnimationWrapper from '../common/page-animation';
import { uploadImage } from '../common/aws';
import { useContext, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { EditorContext } from '../pages/editor.pages';
import EditorJS from '@editorjs/editorjs';
import { tools } from './tools.component';
import axios from 'axios';
import { ThemeContext, UserContext } from '../App';

const BlogEditor = () => {

    let { theme } = useContext(ThemeContext)

    let { blog, blog: {title, banner, content, tags, desc}, setBlog, textEditor, setTextEditor, setEditorState } = useContext(EditorContext)

    let { userAuth:  { access_token } } = useContext(UserContext)
    let { blog_id } = useParams();

    let navigate = useNavigate()

    // useEffect
    useEffect(() => {
        if(!textEditor.isReady){
            let editorElement = document.getElementById("textEditor")
            setTextEditor(new EditorJS({
                holder: editorElement,
                data: Array.isArray(content) ? content[0] : content,
                tools: tools,
                placeholder: "Mari menulis, berbagi pengetahuan, menginspirasi, dan mengubah banyak orang."
            }))
        }
    }, [])

    const handleBannerUpload = (e) => {
        let img = e.target.files[0];

        if(img){

            let loadingToast = toast.loading("Sedang mengunggah...")

            uploadImage(img).then((url) => {
                if(url){

                    toast.dismiss(loadingToast);
                    toast.success("Berhasil diunggah 👌")

                    setBlog({...blog, banner: url})
                }
            })
            .catch(err => {
                toast.dismiss(loadingToast);
                return toast.error(err);
            })
        }
    }

    const handleTitleKeydown = (e) => {
        if(e.keyCode == 13) { // enter key
            e.preventDefault()
        }
    }

    const handleTitleChange = (e) => {
        let input = e.target;

        input.style.height = 'auto';
        input.style.height = input.scrollHeight + "px"

        setBlog({...blog, title: input.value})
    }

    const handleError = (e) => {
        let img = e.target;
        img.src = theme == 'light' ? LightBanner : DarkBanner;
    }

    const handlePublishEvent = () => {
        if( !banner.length ){
            return toast.error("Unggah banner terlebih dahulu")
        }

        if(!title.length){
            return toast.error("Tulis judul terlebih dahulu")
        }

        if(textEditor.isReady){
            textEditor.save().then(data => {
                if(data.blocks.length){
                    setBlog({...blog, content: data})
                    setEditorState("publish")
                }else{
                    return toast.error("Tulis sesuatu di anda artikel terlebih dahulu")
                }
            }) 
            .catch((err) => {
                console.log(err)
            })
        }
    }

    const handleSaveDraft = (e) => {
        
        if(e.target.className.includes("disable")){
            return;
        }

        if(!title.length){
            return toast.error("Write blog title before saving it as a draft")
        }   

        let loadingToast = toast.loading("Saving Draft...")

        e.target.classList.add("disable")

        if(textEditor.isReady){
            textEditor.save().then( content => {

                let blogObj = {
                    title, banner, desc, content, tags, draft: true
                }
        
                axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog", { ...blogObj, id: blog_id }, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`
                    }
                })
                .then(() => {
                    e.target.classList.remove('disable')
        
                    toast.dismiss(loadingToast);
                    toast.success("Saved 👌");
        
                    setTimeout(() => {
                        navigate("/dashboard/blogs?tab=draft")
                    }, 500)
                })
                .catch(({ response }) => {
                    e.target.classList.remove('disable');
                    toast.dismiss(loadingToast);
        
                    return toast.error(response.data.error)
                })

            })
        }

    }

    return (
        <>
            <nav className="navbar">
                <Link to ="/" className="flex-none w-14">
                    <img src={ theme == 'light' ? lightLogo : darkLogo } alt="logo" />
                </Link>
                <p className='max-md:hidden text-black line-clamp-1 w-full'>
                    { title.length ? title : "Artikel Baru" }
                </p>

                <div className='flex gap-4 ml-auto'>
                    <button className='btn-dark py-2'
                        onClick={handlePublishEvent}
                    >
                        Berikutnya
                    </button>
                    <button 
                        className='btn-light py-2'
                        onClick={handleSaveDraft}
                    >
                        Simpan Draf
                    </button>
                </div>
            </nav>
            <Toaster />
            <AnimationWrapper>
                <section>
                    <div className='mx-auto max-w-[900px] w-full'>
                        <div className='relative aspect-video hover:opacity-80 bg-white border-4 border-grey'>
                            <label htmlFor="uploadBanner">
                                <img 
                                    src={banner} 
                                    alt="upload banner" 
                                    className='z-20'
                                    onError={handleError}
                                />
                                <input 
                                    id='uploadBanner'
                                    type="file" 
                                    accept='.png, .jpg, .jpeg'
                                    hidden
                                    onChange={handleBannerUpload}
                                />
                            </label>
                        </div>

                        <textarea
                            defaultValue={title}
                            placeholder='Judul Artikel'
                            className='text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40 bg-white'
                            onKeyDown={handleTitleKeydown}
                            onChange={handleTitleChange}
                        >   
                        </textarea>
                        <hr className='w-full opacity-10 my-5' />
                        <div id='textEditor' className='font-gelasio'></div>
                    </div>
                </section>
            </AnimationWrapper>

        </>
    )
}

export default BlogEditor;