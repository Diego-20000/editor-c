#include <stdio.h>
int main() { int R; R = puts("linea"); printf("%d\n", R >= 0); R = putchar('Z'); putchar('\n'); printf("%d\n", R); puts(""); putchar(65 + 256); putchar(10); return 0; }
