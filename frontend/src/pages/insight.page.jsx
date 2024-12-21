import { useContext, useEffect, useState } from "react"
import AnimationWrapper from "../common/page-animation"
import AnalyticsChart from "../components/chart.component"
import { UserContext } from "../App"
import { getDay } from "../common/date"
import axios from "axios"


const Insight = () => {


  let { userAuth: {access_token} } = useContext(UserContext)
  
  const [ registersChart, setRegistersChart ] = useState({data: [], categories: []})
  const [ topPostsChart, setTopPostsChart ] = useState({data: [], categories: []})
  const [ postsChart, setPostsChart ] = useState({data: [], categories: []})
  
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ registrationsResponse, topPostsResponse, postsResponse ] = await Promise.all([

          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/registrations-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }),
          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/top-post-stats', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          }),
          axios.get(import.meta.env.VITE_SERVER_DOMAIN + '/posts-stats-user', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          })

        ])
        

        const registrationsData = registrationsResponse.data;
        const topPostsData = topPostsResponse.data;
        const postsData = postsResponse.data;

        const formatedRegistrationsData = registrationsData.map( entry => entry.count )
        const formatedRegistrationsCategories = registrationsData.map( entry => getDay(entry._id) )

        const formatedTopPostsData = topPostsData.map(entry => entry.total_reads);
        const formatedTopPostsCategories = topPostsData.map(entry => entry.title);

        const formatedPostsData = postsData.map( entry => entry.count );
        const formatedPostsCategories = postsData.map( entry => getDay(entry._id) )


        setRegistersChart({ data: formatedRegistrationsData, categories: formatedRegistrationsCategories })
        setTopPostsChart({ data: formatedTopPostsData, categories: formatedTopPostsCategories })
        setPostsChart({ data: formatedPostsData, categories: formatedPostsCategories })

        
      } catch (error) {
        console.log('Error fetching user registrations per day:', error)
      }
    }

    fetchData()
  }, [access_token])
    return (
        <AnimationWrapper>
            <h1 className="max-md:hidden mb-5">Statistik Data</h1>
              <AnalyticsChart dataChart={registersChart} type="line" title="Pengunjung" />
              <AnalyticsChart dataChart={topPostsChart} type="bar" title="Artikel Dengan Pengunjung Terbanyak" />
              <AnalyticsChart dataChart={postsChart} type="line" title="Postingan Terbaru" />
              
        </AnimationWrapper>
    )
}

export default Insight