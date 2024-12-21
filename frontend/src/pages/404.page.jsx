import {Link} from "react-router-dom";
import LightPageNotFoundImage from "../imgs/404-dark.png";
import DarkPageNotFoundImage from "../imgs/404-light.png";
import { useContext } from "react";
import { ThemeContext } from "../App";

const PageNotFound = () => {

    let { theme } = useContext(ThemeContext)

    return (
        <section className="h-cover relative p-10 flex flex-col items-center gap-20 text-center">
            <img src={ theme == "light" ? LightPageNotFoundImage : DarkPageNotFoundImage } alt="404" className="select-none border-2 border-grey w-72 aspect-square object-cover rounded" />

            <h1 className="text-4xl font-gelasio leading-7 -mt-8">Halaman tidak ditemukan</h1>
            <p className="text-dark-grey text-xl leading-7 ">Halaman yang anda cari tidak ada pergi ke halaman <Link to="/" className="text-black underline">Beranda</Link> </p>

            <div className="mt-auto">
                {/* <img src={fullLogo} alt="logo" className="h-8 object-contain block mx-auto select-none" /> */}
                <p className="mt-5 text-dark-grey">"Temukan artikel menarik dari Poljan Smart Learning tentang berbagai topik di Politeknik Pajajaran."</p>
            </div>
        </section>
    )
}

export default PageNotFound;