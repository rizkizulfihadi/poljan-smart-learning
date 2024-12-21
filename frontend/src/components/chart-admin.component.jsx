import {
    Card,
    CardBody,
    CardHeader,
    Typography,
  } from "@material-tailwind/react";
import Chart from "react-apexcharts";
import { UserPlusIcon } from "@heroicons/react/24/solid"
import { ClipboardDocumentListIcon } from "@heroicons/react/24/solid"
import { TrophyIcon } from "@heroicons/react/24/solid"
import { HeartIcon } from "@heroicons/react/24/solid"




const AnalyticsChart = ({dataChart, type, title}) => {

    const color = title == "Pengguna Baru" ? "#4F46E5" : title == "Top User Dengan Artikel Terbanyak" ? "#EA580C" : title == "Postingan Terbaru" ? "#16A34A" : "#E11D48";

    const chartConfig = {
        type: type,
        height: 240,
        series: [
          {
            name: title,
            data:dataChart.data,
          },
        ],
        options: {
          chart: {
            toolbar: {
              show: false,
            },
          },
          title: {
            show: "",
          },
          dataLabels: {
            enabled: false,
          },
          colors: [color],
          stroke: {
            lineCap: "round",
            curve: "smooth",
          },
          markers: {
            size: 0,
          },
          xaxis: {
            axisTicks: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
            labels: {
              style: {
                colors: "#616161",
                fontSize: "12px",
                fontFamily: "inherit",
                fontWeight: 400,
              },
            },
            categories: dataChart.categories,
          },
          yaxis: {
            labels: {
              style: {
                colors: "#616161",
                fontSize: "12px",
                fontFamily: "inherit",
                fontWeight: 400,
              },
            },
          },
          grid: {
            show: true,
            borderColor: "#dddddd",
            strokeDashArray: 5,
            xaxis: {
              lines: {
                show: true,
              },
            },
            padding: {
              top: 5,
              right: 20,
            },
          },
          fill: {
            opacity: 0.8,
          },
          tooltip: {
            theme: "dark",
          },
        },
      };

    return (
        <Card className="mb-10">
        <CardHeader
            floated={false}
            shadow={false}
            color="transparent"
            className="flex flex-col gap-4 rounded-none md:flex-row md:items-center"
        >
            <div className={"w-max rounded-lg p-5 text-white " + (title == "Pengguna Baru" ? "bg-indigo-600" : title == "Top User Dengan Artikel Terbanyak" ? "bg-orange-600" : title == "Postingan Terbaru" ? "bg-green-600" : "bg-rose-600")}>
                
              {
                     
                title == "Pengguna Baru" ?  <UserPlusIcon className="h-6 w-6" /> : 
                title == "Postingan Terbaru" ? <ClipboardDocumentListIcon className="h-6 w-6" /> : 
                title == "Top User Dengan Artikel Terbanyak" ? <TrophyIcon className="h-6 w-6" /> : <HeartIcon className="h-6 w-6" /> 

              }
                
            </div>
            <div>
            <Typography variant="h6" color="blue-gray" className="capitalize">
                {type} Chart
            </Typography>
            <Typography
                variant="small"
                color="gray"
                className="max-w-sm font-normal"
            >
                Statistik {title}
            </Typography>
            </div>
        </CardHeader>
        <CardBody className="px-2 pb-0">
            <Chart {...chartConfig} />
        </CardBody>
    </Card>  
    )
}

export default AnalyticsChart;