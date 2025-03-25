import React from "react";
import "./Dashboard.css";
import FetchedVideos from "../../components/fetched-videos/FetchedVideos";
import { ContainerTwo } from "../../components/cards-and-containers/Container";
import PermittedVideos from "../../components/permitted-channel/permittedChannel";
import Processed from "../../components/processed-video/Processed";
import Terminal from "../../components/terminal/Terminal";
import Query from "../../components/query/query";

function Dashboard() {
    return (
        <>
            <div className="dashboard">
                <ContainerTwo >
                    <Query />
                    <FetchedVideos />
                    <PermittedVideos />
                </ContainerTwo>
                <ContainerTwo >
                    <Processed />
                </ContainerTwo>
                <ContainerTwo >
                    <Terminal/>
                </ContainerTwo>
            </div>
        </>
    );
}

export default Dashboard;
