import { useContext, useEffect, useState } from "react"
import AnimationWrapper from "../common/page-animation"
import AnalyticsChart from "../components/chart-admin.component"
import { UserContext } from "../App"
import { getDay } from "../common/date"
import axios from "axios"


const InsightAdmin = () => {


  let { userAuth: {access_token} } = useContext(UserContext)
  
  const [ registersChart, setRegistersChart ] = useState({data: [], categories: []})
  const [ postsChart, setPostsChart ] = useState({data: [], categories: []})
  const [ topUsersByPostsChart, setTopUsersByPostsChart ] = useState({data: [], categories: []})
  const [ topBlogsChart, setTopBlogsChart ] = useState({data: [], categories: []})
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ registrationsResponse, postsResponse, topUsersByPostsResponse, topBlogsResponse ] = await Promise.all([

          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/registrations-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }),
          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/posts-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }),
          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/top-user-by-posts-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }),
          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/top-blogs-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          })

        ])
        

        const registrationsData = registrationsResponse.data;
        const postsData = postsResponse.data;
        const topUserByPostsData = topUsersByPostsResponse.data;
        const topBlogsData = topBlogsResponse.data;

        const formatedRegistrationsData = registrationsData.map( entry => entry.count )
        const formatedRegistrationsCategories = registrationsData.map( entry => getDay(entry._id) )

        const formatedPostsData = postsData.map( entry => entry.count );
        const formatedPostsCategories = postsData.map( entry => getDay(entry._id) )

        const formatedTopUserByPostsData = topUserByPostsData.map( entry => entry.total_posts );
        const formatedTopUserByPostsCategories = topUserByPostsData.map( entry => "@" + entry.username )

        const formatedTopBlogsData = topBlogsData.map( entry => entry.total_likes );
        const formatedTopBlogsCategories = topBlogsData.map( entry => entry.title )

        setRegistersChart({ data: formatedRegistrationsData, categories: formatedRegistrationsCategories })
        setPostsChart({ data: formatedPostsData, categories: formatedPostsCategories })
        setTopUsersByPostsChart({ data: formatedTopUserByPostsData, categories: formatedTopUserByPostsCategories })
        setTopBlogsChart({ data: formatedTopBlogsData, categories: formatedTopBlogsCategories })
      } catch (error) {
        console.log('Error fetching user registrations per day:', error)
      }
    }

    fetchData()
  }, [access_token])
    return (
        <AnimationWrapper>
            <h1 className="max-md:hidden mb-5">Statistik Data</h1>
              <AnalyticsChart dataChart={registersChart} type="line" title="Pengguna Baru" />
              <AnalyticsChart dataChart={topUsersByPostsChart} type="bar" title="Top User Dengan Artikel Terbanyak" />
              <AnalyticsChart dataChart={postsChart} type="line" title="Postingan Terbaru" />
              <AnalyticsChart dataChart={topBlogsChart} type="bar" title="Top Artikel dengan Popularitas Tertinggi" />
        </AnimationWrapper>
    )
}

export default InsightAdmin;