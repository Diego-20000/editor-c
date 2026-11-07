#include <stdio.h>
#include <string.h>
int main() {
  char buf[40];
  int n = 0;
  while (fgets(buf, 40, stdin) != NULL) {
    int len = strlen(buf);
    if (len > 0 && buf[len - 1] == '\n') buf[len - 1] = '\0';
    n++;
    printf("%d: [%s] (%d)\n", n, buf, (int)strlen(buf));
  }
  printf("total %d\n", n);
  return 0;
}
