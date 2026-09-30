package br.com.finamei.revenue;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RevenueProperties.class)
public class RevenueConfig {}