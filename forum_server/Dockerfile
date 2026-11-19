FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null
COPY src src
# build는 test를 포함한다. 테스트가 실패하면 이미지가 만들어지지 않는다.
RUN ./gradlew --no-daemon build && cp build/libs/*-SNAPSHOT.jar /app.jar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
