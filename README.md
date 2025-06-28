# 🛡️ SecureRights: AI-Powered Intellectual Property Protection

SecureRights is an advanced AI-powered platform designed to protect intellectual property across digital platforms. Using cutting-edge machine learning algorithms, it automatically detects unauthorized use of copyrighted content, including videos, images, and other digital assets, providing comprehensive protection for content creators and IP owners.

<img src="https://storage.googleapis.com/vision-hack2skill-production/innovator/USER00000009/1736408607609-SafeguardingStoriesAIforIntellectualPropertyProtection.png" alt="SecureRights IP Protection" style="width: 100%; border-radius: 1em;">

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
git clone https://github.com/sktigpta/Secure-Rights.git
cd Secure-Rights
```

#### 2. Project Structure and Setup
Ensure that the following files and directories are properly configured:

```
📂 Secure-Rights
   ┗ 📜 serviceAccountKey.json

📂 AI
   ┣ 📂 src
   ┃ ┣ 📂 models
   ┃ ┃ ┣ 📂 pretrained
   ┃ ┃ ┃ ┗ 📜 yolov8.pt

   ┃ ┣📂 firebase
   ┃ ┃ ┗ 📜 serviceAccountKey.json

   ┣ 📂 assets
   ┃ ┣ 📂 videos
   ┃ ┃ ┗ ▶️ sample_video.mp4
```

#### Pretrained Model Download
Download the YOLOv8 pretrained model:
- Place the `yolov8.pt` file in the `AI/src/models/pretrained/` directory
- You can download YOLOv8 models from the official Ultralytics repository or use the pre-configured model provided with the project

#### Video Setup
For testing purposes, add a reference video named "sample_video.mp4" to the assets folder:

```bash
cd Secure-Rights/ai/assets/videos
```

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
SecureRights is built on a robust, multi-component architecture designed to provide comprehensive intellectual property protection:

1. **Backend Service**
- Manages data collection and processing
- Handles API endpoints and routing
- Provides authentication and authorization

2. **AI Processing Engine**
- Core detection and analysis functionality
- Performs advanced content matching using YOLOv8
- Identifies potential IP violations with high accuracy

3. **Frontend Dashboard**
- Intuitive user interface for monitoring
- Real-time reporting and analytics
- Content management and review tools

### Technology Stack

| **Category**         | **Technology**                        | **Description**                                      |
|----------------------|--------------------------------------|------------------------------------------------------|
| **Frontend**        | Vite, React.js, Tailwind CSS         | Fast and modern UI development                       |
| **Backend**         | Node.js, Express.js                  | Handles API requests and business logic              |
| **Database**        | Firebase Firestore                   | Stores metadata and flagged content                  |
| **AI/ML**           | OpenCV, YOLOv8, PyTorch/TensorFlow   | Detects unauthorized content in videos and images    |
| **Web Scraping**    | YouTube API, Selenium, Axios         | Fetches video data and metadata                      |
| **Authentication**  | Firebase Auth, JWT                   | Secures access and user sessions                     |
| **Takedown Automation** | Gemini APIs                       | Auto-generates legal takedown requests               |
| **Deployment**      | Vercel                               | Cloud hosting for frontend and backend               |

## 🔄 Use Case Flow Diagram

```mermaid
flowchart TD
    %% Layer 1: User Interface
    A[Content Owner] -->|Monitors Dashboard| B[Dashboard System]
    A -->|Configures Search| C[Search Query Manager]
    
    %% Layer 2: Data Collection
    C -->|Sends API Queries| D[Platform APIs]
    B -->|Sends API Queries| D
    D -->|Fetches Content Data| E[Content Processor]
    
    %% Layer 3: Content Analysis
    E -->|Extracts Features| F[AI Detection Engine]
    F -->|Compares Against| G[(Reference Database)]
    
    %% Layer 4: Decision Paths
    F -->|No Match Found| H[Whitelist Handler]
    F -->|Match Detected| I[DMCA Generator]
    
    %% Layer 5: Takedown Process
    I -->|Sends Takedown Request| J[Platform Takedown API]
    J -->|Content Removed| K[Removal Confirmation]
    
    %% Layer 6: Reporting
    K -->|Updates Activity| L[Audit & Reporting]
    H -->|Log Clean Content| L

    %% Styling (minimal monochrome)
    classDef default stroke:#333,stroke-width:1.5px,color:#fff
    classDef database stroke-dasharray: 5 5

    class G database
    class A,B,C,D,E,F,G,H,I,J,K,L default
```

## 🏗️ Complete System Architecture & Integration

```mermaid
flowchart TD
    %% Layer 1: Client-Server Communication
    A[Client Browser] <-->|HTTPS/WebSocket| B[React Frontend]
    B <-->|REST API| C[Express.js Backend]
    C <-->|NoSQL Queries| D[(Firebase Firestore)]
    
    %% Layer 2: Data Collection
    C -->|API Calls| E[Platform Data APIs]
    E -->|Content Metadata| F[Content Metadata Collector]
    F -->|Store Data| G[(content_metadata)]
    
    %% Layer 3: AI Processing
    H[AI Processing Engine] <-->|Read/Write| D
    H -->|Poll New Content| I[Content Queue Processor]
    I -->|Download & Analyze| J[Content Processor]
    J -->|Object Detection| K[YOLOv8 Engine]
    K -->|Similarity Matching| L[Content Comparison]
    L -->|Store Results| M[(processed_results)]
    
    %% Layer 4: Analytics
    B -->|Data Queries| N[Analytics Dashboard]
    N -->|Fetch Analytics| M
    N -->|Real-time Updates| O[Live Monitoring]
    
    %% Layer 5: Actions
    O -->|User Decisions| P[Legal Action Handler]
    P -->|Auto-Generate| Q[DMCA Generator]
    P -->|Manual Review| R[Whitelist Manager]
    
    %% Layer 6: External
    Q -->|Submit Requests| S[Platform Takedown APIs]
    Q -->|Email Notifications| T[Legal Team Alerts]
    
    %% Layer 7: Monitoring
    H -->|System Logs| U[Activity Logger]
    S -->|Success/Failure| U
    U -->|Generate Reports| V[Compliance Reports]
    
    %% Styling
    classDef frontend fill:#4A89DC,stroke:#3B7DDD,color:white
    classDef backend fill:#967ADC,stroke:#7B5EC6,color:white
    classDef database fill:#37BC9B,stroke:#2FA285,color:white
    classDef api fill:#F6BB42,stroke:#E6A23C,color:black
    classDef ai fill:#E9573F,stroke:#D9433A,color:white
    classDef analytics fill:#3BAFDA,stroke:#2F96BA,color:white
    classDef legal fill:#D770AD,stroke:#C45F9B,color:white
    
    %% Apply styles
    class A,B frontend
    class C backend
    class D,G,M database
    class E,S api
    class H,I,J,K,L ai
    class N,O analytics
    class P,Q,R,T legal
```

## 🎯 Key System Components

### 🔹 **Frontend Layer**
- **React Dashboard**: Modern, responsive interface with real-time updates
- **Analytics Visualization**: Interactive charts and monitoring panels
- **User Management**: Role-based access control and authentication

### 🔹 **Backend Infrastructure** 
- **Express.js API**: RESTful endpoints for data management
- **Firebase Integration**: Real-time database with automatic scaling
- **Authentication**: Secure JWT-based user sessions

### 🔹 **AI Processing Pipeline**
- **YOLOv8 Detection**: State-of-the-art object detection and recognition
- **Content Matching**: Advanced similarity algorithms for IP protection
- **Automated Processing**: Queue-based content analysis system

### 🔹 **Legal Automation**
- **DMCA Generation**: Auto-generated takedown requests
- **Multi-platform Support**: Integration with major content platforms
- **Compliance Tracking**: Automated reporting and audit trails

## 🛠️ Troubleshooting

### Common Installation Issues
- Ensure all prerequisites are installed
- Verify Firebase credentials configuration
- Check API keys and endpoints
- Confirm compatible software versions
- Ensure YOLOv8 model file is properly placed in the pretrained directory

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
- YOLOv8 offers better performance compared to previous YOLO versions

## 🎯 Use Cases

SecureRights can be used by:
- **Content Creators**: Protect original videos, music, and digital content
- **Media Companies**: Monitor unauthorized distribution of proprietary content
- **Artists & Photographers**: Detect unauthorized use of visual works
- **Software Companies**: Protect against unauthorized software distribution
- **Educational Institutions**: Protect copyrighted educational materials

## 👥 Team Members

| Name | Role | Expertise | Contact |
|------|------|-----------|---------|
| **Shaktidhar Gupta** | Team Lead & AI/ML Engineer | AI/ML architecture, computer vision | [sktigpta@gmail.com](mailto:sktigpta@gmail.com) |
| **Satyam Kumar** | Backend Developer | Server architecture, database design | [jhajhasatyam100@gmail.com](mailto:jhajhasatyam100@gmail.com) |
| **Saurav Kumar** | Frontend Designer & UI/UX | Interface design, user experience | [sauravkumar9447@gmail.com](mailto:sauravkumar9447@gmail.com) |
| **Rishi Srestha** | Frontend Developer & Documentation | UI implementation, documentation | []() |

## 🤝 Contribution
We welcome contributions to improve SecureRights! Please see [CONTRIBUTION.md](CONTRIBUTION.md) for guidelines on how to contribute.

## 📜 License
This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for full details.

## 🌟 Features

- **Real-time Monitoring**: Continuous scanning of digital platforms
- **Advanced AI Detection**: YOLOv8-powered content recognition
- **Automated Takedowns**: Streamlined DMCA request generation
- **Multi-platform Support**: Works across various content platforms
- **User-friendly Dashboard**: Intuitive interface for content management
- **Compliance Reporting**: Detailed audit trails and reports

---

*Innovative Intellectual Property Protection, Powered by AI* 🚀
