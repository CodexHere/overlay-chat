FROM docker:dind

RUN apk add --no-cache curl && \
    curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sh

WORKDIR /act

CMD sh -c "act"
