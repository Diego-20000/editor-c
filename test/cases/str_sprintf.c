#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main() {
  char buf[50], num[10] = "12345abc", otro[20];
  int n = sprintf(buf, "x=%d y=%.2f %s", 7, 3.14159, "ok");
  printf("%s (%d)\n", buf, n);
  snprintf(otro, 6, "%s", "abcdefghij");
  printf("[%s]\n", otro);
  printf("%d %ld %.3f %d\n", atoi(num), atol("  -99xyz"), atof("2.5e2zz"), atoi("abc"));
  puts(buf);
  return 0;
}
