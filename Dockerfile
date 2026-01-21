FROM httpd:2.4-bookworm

# Install Python 3.11 (pinned to Debian Bookworm's version)
RUN apt-get update && apt-get install -y python3=3.11.2-1+b1 python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages -r /tmp/requirements.txt

# Create necessary directories
RUN mkdir -p /usr/local/apache2/cgi-bin && \
    mkdir -p /usr/local/apache2/data/plays && \
    mkdir -p /usr/local/apache2/data/highscores && \
    mkdir -p /usr/local/apache2/data/high_scores

# Copy web files to Apache's document root
COPY *.html script.js styles.css /usr/local/apache2/htdocs/

# Copy Python CGI scripts
COPY cgi-bin/*.py /usr/local/apache2/cgi-bin/

# Ensure Python scripts are executable
RUN chmod +x /usr/local/apache2/cgi-bin/*.py

# Add Python shebang to all Python scripts
RUN for file in /usr/local/apache2/cgi-bin/*.py; do \
        sed -i '1s|^.*$|#!/usr/bin/python3|' "$file"; \
    done

# Copy data files (txt and json)
COPY data/*.txt /usr/local/apache2/data/
COPY data/*.json /usr/local/apache2/data/

# Enable CGI execution in Apache
COPY httpd.conf /usr/local/apache2/conf/httpd.conf

# Set proper permissions for data directory
RUN chown -R www-data:www-data /usr/local/apache2/data && \
    chmod -R 755 /usr/local/apache2/data

# Expose port 80
EXPOSE 80

# Start Apache in foreground
CMD ["httpd-foreground"]