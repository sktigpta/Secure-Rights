# 🛡️ SecureRights.app: AI for Intellectual Property Protection

Disney's vast library of intellectual property, including movies, TV shows, and characters, is a prime target for cyberattacks and piracy. Unauthorized access and distribution of this content can lead to significant financial losses and damage to the brand.

<img src="https://storage.googleapis.com/vision-hack2skill-production/innovator/USER00000009/1736408607609-SafeguardingStoriesAIforIntellectualPropertyProtection.png" alt="Disney IP Protection" style="width: 100%; border-radius: 1em;">

## 🚀 Getting Started

### System Requirements
Before installation, ensure your system meets these minimum requirements:
- **RAM**: 4GB or higher (8GB recommended)
- **Storage**: 10GB free space
- **CPU**: Intel i5 or equivalent (for CPU-only processing)
- **GPU**: 4GB+ VRAM with CUDA support (for accelerated processing)
- **Operating System**: Windows 10/11, macOS 12+, or Ubuntu 20.04+

Processing on CPU-only setups will work but will be significantly time-consuming compared to GPU-accelerated systems.

### Prerequisites
Before proceeding with the installation, ensure that you have the following dependencies installed:
- **Node.js** (Version 14 or higher)
- **Python** (Version 3.8 or higher)
- **Firebase Account**
- **YouTube Data API Key**

### Installation

#### 1. Clone the Repository
Begin by cloning the repository and navigating to the project directory:

```bash
git clone https://github.com/sktigpta/Gdg-Solution-Challenge.git
cd Gdg-Solution-Challenge
```

#### 2. Project Structure and Setup
Ensure that the following files and directories are properly configured:

```
📂 Gdg-Solution-Challenge
   ┗ 📜 serviceAccountKey.json

📂 AI
   ┣ 📂 src
   ┃ ┣ 📂 models
   ┃ ┃ ┣ 📂 pretrained
   ┃ ┃ ┃ ┣ 📜 coco.names
   ┃ ┃ ┃ ┣ 📜 yolov4.cfg
   ┃ ┃ ┃ ┗ 📜 yolov4.weights

   ┃ ┣📂 firebase
   ┃ ┃ ┗ 📜 serviceAccountKey.json

   ┣ 📂 assets
   ┃ ┣ 📂 videos
   ┃ ┃ ┗ ▶️ sample_video.mp4
```

#### Pretrained Weights Download
Download the pretrained weights from the following link:
[Pretrained Folder](https://drive.google.com/drive/folders/1NtmtMsHVJeZ611tBFiSl39ZJBFnVd3Wm?usp=sharing)

#### Video Download
If the video is available on YouTube, download it by navigating to:

```bash
cd Gdg-Solution-Challenge/ai/assets/videos
```

Then, add a reference video named "sample_video.mp4"

#### 3. Backend Setup
Navigate to the `backend` directory and install the required dependencies:

```bash
cd backend
npm install
cp .env.example .env
```

Edit the `.env` file with your API keys and necessary configurations. Then, start the backend server:

```bash
npm start
```

#### 4. AI Module Setup
Set up the AI module by creating a virtual environment and installing dependencies:

```bash
cd ../ai
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
pip install -r requirements.txt
```

Configure Firebase credentials and run the AI module:

```bash
python main.py
```

#### 5. Frontend Setup
Navigate to the `client` directory and install the frontend dependencies:

```bash
cd ../client
npm install
cp .env.example .env
```

Edit the `.env` file to configure the API endpoint. Then, start the frontend server:

```bash
npm start
```

**Your project is now set up and ready to use! 🚀**

## 🔍 Detailed Project Overview

### System Architecture
The SecureRights.app project is built on a robust, multi-component architecture designed to provide comprehensive intellectual property protection:

1. **Backend Service**
- Manages data collection
- Handles API endpoints
- Provides authentication and authorization

2. **AI Processing Engine**
- Core detection and analysis functionality
- Performs advanced content matching
- Identifies potential IP violations

3. **Frontend Dashboard**
- Intuitive user interface
- Real-time monitoring and reporting
- Content management tools

### Technology Stack

| **Category**         | **Technology**                        | **Description**                                      |
|----------------------|--------------------------------------|------------------------------------------------------|
| **Frontend**        | Vite, React.js, Tailwind CSS         | Fast and modern UI development                       |
| **Backend**         | Node.js, Express.js                  | Handles API requests and business logic              |
| **Database**        | Firebase Firestore                   | Stores metadata and flagged content                  |
| **AI/ML**           | OpenCV, YOLO, PyTorch/TensorFlow     | Detects pirated content in videos and images         |
| **Web Scraping**    | YouTube API, Selenium, Axios         | Fetches video data and metadata                      |
| **Authentication**  | Firebase Auth, JWT                   | Secures access and user sessions                     |
| **Takedown Automation** | Gemini APIs                       | Auto-generates legal takedown requests               |
| **Deployment**      | Vercel                               | Cloud hosting for frontend and backend               |

## Use case diagram

```mermaid
graph TD
    A[Admin] -->|Monitors Dashboard| B[Dashboard System]
    A -->|Manages Search Queries| C[Search Query Manager]
    B -->|Sends Queries| D[YouTube API]
    D -->|Fetches Videos| E[Video Processor]
    E -->|Extracts Frames & Audio| F[AI Detection Engine]
    F -->|Matches Reference Data| G[Database]
    F -->|No Match| H[Whitelist Handler]
    F -->|Match Found| I[DMCA Generator]
    I -->|Sends Requests| J[YouTube Takedown API]
    J -->|Removes Content| K[Content Removal Confirmation]
    K -->|Updates Logs| L[Audit & Reporting]

    style A fill:#4CAF50,stroke:#333,stroke-width:2px
```
## Complete System Architecture and Integration

```mermaid
flowchart TD
    A[Client Browser] <--> B[Frontend React App]
    
    B <--> C[Backend Express Server]
    C <--> D[(Firebase Database)]

    C --> E[YouTube API Service]
    E --> F[Video Metadata Collection]
    F --> G[Store in youtube_videos]

    H[AI Processing Engine] <--> D
    H --> I[Poll youtube_videos]
    I --> J[Download & Process Videos]
    J --> K[YOLO Detection & Comparison]
    K --> L[Store Results in processed_collection]

    B --> M[Dashboard Visualization]
    M --> N[Fetch from processed_collection]
    M --> O[User Actions]
    O --> P[DMCA Generation]
    O --> Q[Whitelist Management]

    classDef main fill:#08d449,stroke:#333,stroke-width:2px
    classDef backend fill:#2196F3,stroke:#333,stroke-width:1px
    classDef ai fill:#959efc,stroke:#333,stroke-width:1px
    classDef storage fill:#ccc,stroke:#333,stroke-width:1px
    classDef external fill:#f2a891,stroke:#333,stroke-width:1px

    class A,B main
    class C backend
    class D storage
    class H,K ai
    class P,Q external
```

## 🛠️ Troubleshooting

### Common Installation Issues
- Ensure all prerequisites are installed
- Verify Firebase credentials configuration
- Check API keys and endpoints
- Confirm compatible software versions

### Dependency Conflicts
If you encounter dependency conflicts:
1. Update to the latest versions of Node.js and Python
2. Use virtual environments
3. Clear npm and pip caches
4. Reinstall dependencies

### Performance Issues
- If processing is slow, ensure GPU acceleration is properly configured
- For systems with limited resources, reduce the batch size in the AI configuration
- Consider using remote processing for systems that don't meet minimum requirements

## 👥 Team Members

| Name | Role | Expertise | Contact |
|------|------|-----------|---------|
| **Shaktidhar Gupta** | Team Lead & AI/ML Engineer | AI/ML architecture, computer vision | [sktigpta@gmail.com](mailto:sktigpta@gmail.com) |
| **Satyam Kumar** | Backend Developer | Server architecture, database design | [jhajhasatyam100@gmail.com](mailto:jhajhasatyam100@gmail.com) |
| **Saurav Kumar** | Frontend Designer & UI/UX | Interface design, user experience | [sauravkumar9447@gmail.com](mailto:sauravkumar9447@gmail.com) |
| **Rishi Srestha** | Frontend Developer & Documentation | UI implementation, documentation | [rishi@example.com](mailto:rishi@example.com) |

## 🤝 Contribution
We welcome contributions to improve SecureRights.app! Please see [CONTRIBUTION.md](CONTRIBUTION.md) for guidelines on how to contribute.

## 📜 License
This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for full details.

Visit us at [securerights.app](https://securerights.app)

*Innovative Intellectual Property Protection, Powered by AI* 🚀
