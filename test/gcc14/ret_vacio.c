#include <stdio.h>
int f(int X) {
 if (X > 0) return;
 return 1;
}
int main() {
 printf("%d\n", f(0));
}
