# Submission Evaluation API

## 📌 프로젝트 개요
- 학생 제출물(텍스트, 동영상 등)을 업로드하고 평가 및 수정 이력을 관리하는 API 서비스
- NestJS 기반, PostgreSQL + Prisma ORM, Kafka 비동기 처리

---

## 🚀 실행 방법

### 1. Prerequisites
- Docker, Docker Compose 설치 필요

### 2. 로컬 실행
```bash
$ git clone https://github.com/yourname/submission-eval-api.git
$ cd submission-eval-api
$ npm install
$ docker-compose up --build -d
$ npm run start:dev
```
---

## 🚀 Getting Started

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)

### Installation
```bash
# Repository 클론
$ git clone https://github.com/yourname/submission-eval-api.git
$ cd submission-eval-api

# 의존성 설치
$ npm install
```
### 2. 환경 변수
.env.example 참고하여 .env 파일 생성:
```bash
# Database
DATABASE_URL=postgresql://app:app@postgres:5432/se_api
JWT_SECRET=dev-secret-change-me
JWT_EXPIRES_IN=1h

# Kafka
KAFKA_BROKERS=kafka:9092

# Slack (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX/YYYY/ZZZZ

# Azure Storage & OpenAI (옵션)
AZURE_ACCOUNT_NAME=jiyeonstorage
AZURE_ACCOUNT_KEY=...
AZURE_CONNECTION_STRING=...
AZURE_CONTAINER=task

AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=feedback-01
AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

---
### 🧪 테스트 방법
E2E 테스트는 Docker 환경에서 실행하는 것을 권장합니다.
```bash 
# Unit Test (서비스/도메인 레벨)
$ npm run test

# Coverage 리포트
$ npm run test:cov

# E2E Test (로컬 DB 연결)
$ npm run test:e2e

# E2E Test (Docker 환경)
$ docker-compose run --rm e2e
```
---
### 🗄 DB 문서
ERD

(여기에 ERD 이미지 또는 Mermaid 다이어그램 추가)

테이블 정의
•	Prisma schema.prisma 참조
•	또는 마이그레이션 SQL 스크립트 포함

---

### 💻 코드 산출물
- NestJS 기반 서버 코드 (src/ 디렉토리)
- Prisma 스키마 및 마이그레이션 (prisma/ 디렉토리)
- Docker 통합 실행 (docker-compose.yml, Dockerfile)

---

### 🧩 테스트 코드
- Unit Test: 서비스/도메인 레벨 검증
- Integration Test: API ↔ DB ↔ Kafka 통합 검증
- 실행 커버리지 리포트 제공 (npm run test:cov)

--- 
### 🧪 API Documentation

- Swagger UI 제공: http://localhost:3000/api-docs
- 주요 기능
  -	🔑 인증 (JWT)
  -	📤 제출 CRUD
  -	✅ 평가 생성/조회
  - 📝 수정 이력 관리
  -	통계 API
