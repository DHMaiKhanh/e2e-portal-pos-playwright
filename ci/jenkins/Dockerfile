# Jenkins controller cho suite E2E Portal POS.
#
# Khác image gốc ở hai chỗ, cả hai đều bắt buộc với Jenkinsfile của repo này:
#   1. Có docker CLI  — `agent { docker { image ... } }` gọi thẳng lệnh `docker`
#      trên node. Image jenkins/jenkins không kèm CLI, thiếu nó build đỏ ngay
#      với "docker: not found".
#   2. Cài sẵn plugin — khỏi phải bấm tay 10 plugin qua UI sau mỗi lần dựng lại.
FROM jenkins/jenkins:lts-jdk21

USER root

# docker-ce-cli thôi, không cần daemon: daemon nằm ở container `dind` riêng
# (xem docker-compose.yml), CLI nói chuyện với nó qua TCP + TLS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli \
 && rm -rf /var/lib/apt/lists/*

USER jenkins

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
